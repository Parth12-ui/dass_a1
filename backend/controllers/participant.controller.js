const crypto = require('crypto');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Organizer = require('../models/Organizer');
const { generateQR } = require('../utils/qrcode');
const { sendTicketEmail } = require('../utils/email');

/**
 * GET /api/participants/dashboard
 * My events: upcoming + participation history
 */
const getDashboard = async (req, res) => {
    try {
        const userId = req.user.id;

        // All registrations for this user
        const registrations = await Registration.find({ participant: userId })
            .populate('event')
            .sort({ registeredAt: -1 });

        const now = new Date();

        const upcoming = registrations.filter(
            (r) => r.status === 'confirmed' && r.event && new Date(r.event.startDate) > now
        );

        const history = {
            normal: registrations.filter((r) => r.event && r.event.type === 'normal'),
            merchandise: registrations.filter((r) => r.event && r.event.type === 'merchandise'),
            completed: registrations.filter(
                (r) => r.event && (r.event.status === 'completed' || r.event.status === 'closed')
            ),
            cancelled: registrations.filter(
                (r) => r.status === 'cancelled' || r.status === 'rejected'
            ),
        };

        res.json({ upcoming, history });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/participants/profile
 */
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('followedOrganizers', 'name category');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PUT /api/participants/profile
 * Edit profile & preferences
 */
const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, contactNumber, collegeName, interests, followedOrganizers, onboardingCompleted } = req.body;

        const updates = {};
        if (firstName !== undefined) updates.firstName = firstName;
        if (lastName !== undefined) updates.lastName = lastName;
        if (contactNumber !== undefined) updates.contactNumber = contactNumber;
        if (collegeName !== undefined) updates.collegeName = collegeName;
        if (interests !== undefined) updates.interests = interests;
        if (followedOrganizers !== undefined) updates.followedOrganizers = followedOrganizers;
        if (onboardingCompleted !== undefined) updates.onboardingCompleted = onboardingCompleted;

        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).populate(
            'followedOrganizers',
            'name category'
        );

        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'Profile updated', user });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/participants/browse
 * Search, filter, trending events
 */
const browseEvents = async (req, res) => {
    try {
        const {
            search,
            type,
            eligibility,
            startDate,
            endDate,
            followedOnly,
            trending,
            page = 1,
            limit = 20,
        } = req.query;

        const query = { status: { $in: ['published', 'ongoing'] } };

        // Text search (partial / fuzzy via regex)
        if (search) {
            const regex = new RegExp(search.split('').join('.*'), 'i');
            query.$or = [{ name: regex }, { description: regex }, { tags: regex }];
        }

        // Filters
        if (type) query.type = type;
        if (eligibility && eligibility !== 'all') query.eligibility = eligibility;

        if (startDate || endDate) {
            query.startDate = {};
            if (startDate) query.startDate.$gte = new Date(startDate);
            if (endDate) query.startDate.$lte = new Date(endDate);
        }

        // Followed clubs only
        if (followedOnly === 'true') {
            const user = await User.findById(req.user.id);
            if (user && user.followedOrganizers.length > 0) {
                query.organizer = { $in: user.followedOrganizers };
            }
        }

        // Trending: top 5 by registrations in last 24h
        if (trending === 'true') {
            const events = await Event.find({ status: { $in: ['published', 'ongoing'] } })
                .sort({ registrationsLast24h: -1 })
                .limit(5)
                .populate('organizer', 'name category');
            return res.json({ events, trending: true });
        }

        // Sorting: if user has interests, prioritize matching tags
        let sortOption = { startDate: 1 };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const events = await Event.find(query)
            .populate('organizer', 'name category')
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Event.countDocuments(query);

        // If user has preferences, re-order to boost matching events
        let userId = req.user.id;
        const user = await User.findById(userId);
        let orderedEvents = events;

        if (user && user.interests && user.interests.length > 0) {
            orderedEvents = events.sort((a, b) => {
                const aMatch = a.tags.filter((t) => user.interests.includes(t)).length;
                const bMatch = b.tags.filter((t) => user.interests.includes(t)).length;
                return bMatch - aMatch; // higher match first
            });
        }

        res.json({
            events: orderedEvents,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        console.error('Browse events error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/participants/events/:id
 * Event detail page
 */
const getEventDetail = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('organizer', 'name category contactEmail');
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Check if participant is already registered
        const existingReg = await Registration.findOne({
            event: event._id,
            participant: req.user.id,
        });

        res.json({
            event,
            isRegistered: !!existingReg,
            registration: existingReg || null,
        });
    } catch (err) {
        console.error('Event detail error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/participants/events/:id/register
 * Register for a normal event
 */
const registerForEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Validations
        if (event.type !== 'normal') {
            return res.status(400).json({ message: 'Use the purchase endpoint for merchandise events' });
        }
        if (event.status !== 'published' && event.status !== 'ongoing') {
            return res.status(400).json({ message: 'Event is not open for registration' });
        }
        if (new Date() > new Date(event.registrationDeadline)) {
            return res.status(400).json({ message: 'Registration deadline has passed' });
        }
        if (event.registrationLimit > 0 && event.registrationCount >= event.registrationLimit) {
            return res.status(400).json({ message: 'Registration limit reached' });
        }

        // Eligibility check
        const user = await User.findById(req.user.id);
        if (event.eligibility !== 'all' && event.eligibility !== user.participantType) {
            return res.status(403).json({ message: 'You are not eligible for this event' });
        }

        // Check duplicate
        const existing = await Registration.findOne({ event: event._id, participant: req.user.id });
        if (existing) {
            return res.status(409).json({ message: 'You are already registered for this event' });
        }

        // Generate ticket
        const ticketId = `TKT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        const qrCode = await generateQR(ticketId);

        const registration = new Registration({
            event: event._id,
            participant: req.user.id,
            ticketId,
            qrCode,
            status: 'confirmed',
            formResponses: req.body.formResponses || {},
            paymentStatus: event.registrationFee > 0 ? 'paid' : 'na',
        });

        await registration.save();

        // Update event counters
        event.registrationCount += 1;
        event.registrationsLast24h += 1;
        if (event.registrationFee > 0) {
            event.totalRevenue += event.registrationFee;
        }
        // Lock form after first registration
        if (!event.formLocked && event.customForm.length > 0) {
            event.formLocked = true;
        }
        await event.save();

        // Send ticket email
        try {
            await sendTicketEmail(user.email, {
                ticketId,
                eventName: event.name,
                eventDate: new Date(event.startDate).toLocaleDateString(),
                participantName: `${user.firstName} ${user.lastName}`,
                qrCode,
            });
        } catch (emailErr) {
            console.error('Email sending failed:', emailErr);
        }

        res.status(201).json({
            message: 'Registration successful',
            registration,
        });
    } catch (err) {
        console.error('Register for event error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/participants/events/:id/purchase
 * Purchase merchandise — enters pending state until organizer approves
 */
const purchaseMerchandise = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (event.type !== 'merchandise') {
            return res.status(400).json({ message: 'This is not a merchandise event' });
        }
        if (event.status !== 'published' && event.status !== 'ongoing') {
            return res.status(400).json({ message: 'Event is not open for purchases' });
        }
        if (new Date() > new Date(event.registrationDeadline)) {
            return res.status(400).json({ message: 'Purchase deadline has passed' });
        }

        const { selections } = req.body; // [{ itemId, size, color, variant, quantity }]
        if (!selections || selections.length === 0) {
            return res.status(400).json({ message: 'No items selected' });
        }

        // Validate stock and limits
        let totalCost = 0;
        const merchandiseSelections = [];

        for (const sel of selections) {
            const item = event.merchandiseItems.id(sel.itemId);
            if (!item) {
                return res.status(400).json({ message: `Item ${sel.itemId} not found` });
            }
            if (item.stockQuantity < (sel.quantity || 1)) {
                return res.status(400).json({ message: `${item.name} is out of stock` });
            }

            // Check per-participant purchase limit
            const existingPurchases = await Registration.find({
                event: event._id,
                participant: req.user.id,
                'merchandiseSelections.itemId': item._id,
                status: { $ne: 'rejected' },
            });

            const alreadyPurchased = existingPurchases.reduce((sum, reg) => {
                const sel2 = reg.merchandiseSelections.find(
                    (s) => s.itemId.toString() === item._id.toString()
                );
                return sum + (sel2 ? sel2.quantity : 0);
            }, 0);

            if (alreadyPurchased + (sel.quantity || 1) > item.purchaseLimitPerParticipant) {
                return res.status(400).json({
                    message: `Purchase limit exceeded for ${item.name}. Limit: ${item.purchaseLimitPerParticipant}`,
                });
            }

            totalCost += item.price * (sel.quantity || 1);

            merchandiseSelections.push({
                itemId: item._id,
                itemName: item.name,
                size: sel.size || '',
                color: sel.color || '',
                variant: sel.variant || '',
                quantity: sel.quantity || 1,
            });
        }

        // Create registration in PENDING state (no stock decrement, no ticket yet)
        const registration = new Registration({
            event: event._id,
            participant: req.user.id,
            status: 'pending',
            merchandiseSelections,
            paymentStatus: totalCost > 0 ? 'pending_approval' : 'na',
        });

        await registration.save();

        res.status(201).json({
            message: 'Order placed! Please upload payment proof for approval.',
            registration,
            totalCost,
        });
    } catch (err) {
        console.error('Purchase merchandise error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/participants/events/:id/payment-proof
 * Upload payment proof image
 */
const multer = require('multer');
const path = require('path');

const paymentStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/payments')),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const uploadPayment = multer({ storage: paymentStorage, limits: { fileSize: 5 * 1024 * 1024 } });

const uploadPaymentProof = [
    uploadPayment.single('paymentProof'),
    async (req, res) => {
        try {
            const { registrationId } = req.body;
            if (!registrationId) {
                return res.status(400).json({ message: 'Registration ID is required' });
            }

            const registration = await Registration.findOne({
                _id: registrationId,
                participant: req.user.id,
            });
            if (!registration) return res.status(404).json({ message: 'Registration not found' });

            if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

            registration.paymentProofUrl = `/uploads/payments/${req.file.filename}`;
            await registration.save();

            res.json({ message: 'Payment proof uploaded', paymentProofUrl: registration.paymentProofUrl });
        } catch (err) {
            console.error('Upload payment proof error:', err);
            res.status(500).json({ message: 'Server error' });
        }
    },
];

/**
 * GET /api/participants/tickets/:id
 * View ticket with QR code
 */
const getTicket = async (req, res) => {
    try {
        const registration = await Registration.findOne({
            ticketId: req.params.id,
            participant: req.user.id,
        }).populate('event', 'name type startDate endDate organizer');

        if (!registration) return res.status(404).json({ message: 'Ticket not found' });

        res.json(registration);
    } catch (err) {
        console.error('Get ticket error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/participants/organizers
 * List all active organizers
 */
const listOrganizers = async (req, res) => {
    try {
        const organizers = await Organizer.find({ isActive: true }).select(
            'name category description contactEmail'
        );
        res.json(organizers);
    } catch (err) {
        console.error('List organizers error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/participants/organizers/:id
 * Organizer detail + their events
 */
const getOrganizerDetail = async (req, res) => {
    try {
        const organizer = await Organizer.findById(req.params.id).select(
            'name category description contactEmail'
        );
        if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

        const now = new Date();
        const upcomingEvents = await Event.find({
            organizer: organizer._id,
            status: { $in: ['published', 'ongoing'] },
            startDate: { $gte: now },
        }).sort({ startDate: 1 });

        const pastEvents = await Event.find({
            organizer: organizer._id,
            status: { $in: ['completed', 'closed'] },
        }).sort({ endDate: -1 });

        // Check if current user follows this organizer
        const user = await User.findById(req.user.id);
        const isFollowing = user.followedOrganizers.includes(organizer._id);

        res.json({ organizer, upcomingEvents, pastEvents, isFollowing });
    } catch (err) {
        console.error('Organizer detail error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/participants/organizers/:id/follow
 * Toggle follow/unfollow
 */
const toggleFollow = async (req, res) => {
    try {
        const organizerId = req.params.id;
        const user = await User.findById(req.user.id);

        const organizer = await Organizer.findById(organizerId);
        if (!organizer || !organizer.isActive) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        const index = user.followedOrganizers.indexOf(organizerId);
        if (index > -1) {
            user.followedOrganizers.splice(index, 1);
            await user.save();
            res.json({ message: 'Unfollowed', isFollowing: false });
        } else {
            user.followedOrganizers.push(organizerId);
            await user.save();
            res.json({ message: 'Followed', isFollowing: true });
        }
    } catch (err) {
        console.error('Toggle follow error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getDashboard,
    getProfile,
    updateProfile,
    browseEvents,
    getEventDetail,
    registerForEvent,
    purchaseMerchandise,
    uploadPaymentProof,
    getTicket,
    listOrganizers,
    getOrganizerDetail,
    toggleFollow,
};
