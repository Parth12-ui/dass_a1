const crypto = require('crypto');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const Organizer = require('../models/Organizer');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const { generateParticipantCSV } = require('../utils/csv');
const { postEventToDiscord } = require('../utils/discord');
const { generateQR } = require('../utils/qrcode');
const { sendMerchApprovalEmail } = require('../utils/email');

/**
 * GET /api/organizer/dashboard
 * Events list + analytics
 */
const getDashboard = async (req, res) => {
    try {
        const organizerId = req.user.id;

        const events = await Event.find({ organizer: organizerId }).sort({ createdAt: -1 });

        // Aggregate analytics for completed events
        const completedEvents = events.filter(
            (e) => e.status === 'completed' || e.status === 'closed'
        );

        const analytics = {
            totalEvents: events.length,
            totalRegistrations: events.reduce((sum, e) => sum + e.registrationCount, 0),
            totalRevenue: events.reduce((sum, e) => sum + e.totalRevenue, 0),
            totalAttendance: events.reduce((sum, e) => sum + e.attendanceCount, 0),
            completedEvents: completedEvents.length,
        };

        res.json({ events, analytics });
    } catch (err) {
        console.error('Organizer dashboard error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/organizer/events
 * Create event (draft)
 */
const createEvent = async (req, res) => {
    try {
        const {
            name,
            description,
            type,
            eligibility,
            registrationDeadline,
            startDate,
            endDate,
            registrationLimit,
            registrationFee,
            tags,
            customForm,
            merchandiseItems,
        } = req.body;

        if (!name || !type || !registrationDeadline || !startDate || !endDate) {
            return res.status(400).json({ message: 'Required fields: name, type, registrationDeadline, startDate, endDate' });
        }

        const event = new Event({
            name,
            description: description || '',
            type,
            eligibility: eligibility || 'all',
            registrationDeadline,
            startDate,
            endDate,
            registrationLimit: registrationLimit || 0,
            registrationFee: registrationFee || 0,
            organizer: req.user.id,
            tags: tags || [],
            status: 'draft',
            isTeamEvent: req.body.isTeamEvent || false,
            teamSize: req.body.teamSize || { min: 2, max: 4 },
            customForm: type === 'normal' ? (customForm || []) : [],
            merchandiseItems: type === 'merchandise' ? (merchandiseItems || []) : [],
        });

        await event.save();

        res.status(201).json({ message: 'Event created as draft', event });
    } catch (err) {
        console.error('Create event error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/organizer/events/:id
 * Event detail + analytics
 */
const getEventDetail = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user.id });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const registrations = await Registration.find({ event: event._id })
            .populate('participant', 'firstName lastName email contactNumber')
            .sort({ registeredAt: -1 });

        const analytics = {
            totalRegistrations: event.registrationCount,
            totalRevenue: event.totalRevenue,
            totalAttendance: event.attendanceCount,
            confirmedRegistrations: registrations.filter((r) => r.status === 'confirmed').length,
            cancelledRegistrations: registrations.filter(
                (r) => r.status === 'cancelled' || r.status === 'rejected'
            ).length,
        };

        res.json({ event, registrations, analytics });
    } catch (err) {
        console.error('Get event detail error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PUT /api/organizer/events/:id
 * Edit event (status-dependent rules)
 */
const updateEvent = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user.id });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const updates = req.body;

        switch (event.status) {
            case 'draft':
                // Free edits allowed
                Object.keys(updates).forEach((key) => {
                    if (key !== '_id' && key !== 'organizer' && key !== 'status') {
                        event[key] = updates[key];
                    }
                });
                break;

            case 'published':
                // Limited edits: description, deadline extension, limit increase, close registrations
                const allowedPublished = ['description', 'registrationDeadline', 'registrationLimit'];
                Object.keys(updates).forEach((key) => {
                    if (allowedPublished.includes(key)) {
                        if (key === 'registrationDeadline') {
                            // Can only extend
                            if (new Date(updates[key]) > new Date(event.registrationDeadline)) {
                                event[key] = updates[key];
                            }
                        } else if (key === 'registrationLimit') {
                            // Can only increase
                            if (updates[key] >= event.registrationLimit) {
                                event[key] = updates[key];
                            }
                        } else {
                            event[key] = updates[key];
                        }
                    }
                });
                break;

            case 'ongoing':
            case 'completed':
                // No edits except status changes (handled by separate endpoints)
                return res.status(400).json({
                    message: 'Cannot edit event in current status. Only status changes are allowed.',
                });

            default:
                return res.status(400).json({ message: 'Invalid event status' });
        }

        await event.save();
        res.json({ message: 'Event updated', event });
    } catch (err) {
        console.error('Update event error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PUT /api/organizer/events/:id/publish
 * Publish a draft event
 */
const publishEvent = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user.id });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (event.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft events can be published' });
        }

        event.status = 'published';
        await event.save();

        // Post to Discord if webhook configured
        const organizer = await Organizer.findById(req.user.id);
        if (organizer && organizer.discordWebhookUrl) {
            try {
                await postEventToDiscord(organizer.discordWebhookUrl, event);
            } catch (discordErr) {
                console.error('Discord post failed:', discordErr);
            }
        }

        res.json({ message: 'Event published', event });
    } catch (err) {
        console.error('Publish event error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PUT /api/organizer/events/:id/close
 * Close/complete an event
 */
const closeEvent = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user.id });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const { newStatus } = req.body; // 'completed', 'closed', 'ongoing'
        const validTransitions = {
            published: ['ongoing', 'closed'],
            ongoing: ['completed', 'closed'],
        };

        if (!validTransitions[event.status] || !validTransitions[event.status].includes(newStatus)) {
            return res.status(400).json({
                message: `Cannot transition from '${event.status}' to '${newStatus}'`,
            });
        }

        event.status = newStatus;
        await event.save();

        res.json({ message: `Event status changed to ${newStatus}`, event });
    } catch (err) {
        console.error('Close event error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/organizer/events/:id/participants
 * Participant list + CSV export
 */
const getParticipants = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user.id });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const { search, status, exportCsv } = req.query;

        const query = { event: event._id };
        if (status) query.status = status;

        let registrations = await Registration.find(query)
            .populate('participant', 'firstName lastName email contactNumber collegeName')
            .sort({ registeredAt: -1 });

        // Search filter
        if (search) {
            const regex = new RegExp(search, 'i');
            registrations = registrations.filter(
                (r) =>
                    r.participant &&
                    (regex.test(r.participant.firstName) ||
                        regex.test(r.participant.lastName) ||
                        regex.test(r.participant.email))
            );
        }

        // CSV export
        if (exportCsv === 'true') {
            const csv = generateParticipantCSV(registrations);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${event.name}_participants.csv"`);
            return res.send(csv);
        }

        res.json({ participants: registrations, total: registrations.length });
    } catch (err) {
        console.error('Get participants error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/organizer/profile
 */
const getProfile = async (req, res) => {
    try {
        const organizer = await Organizer.findById(req.user.id);
        if (!organizer) return res.status(404).json({ message: 'Organizer not found' });
        res.json(organizer);
    } catch (err) {
        console.error('Get organizer profile error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PUT /api/organizer/profile
 * Edit profile + Discord webhook
 */
const updateProfile = async (req, res) => {
    try {
        const { name, category, description, contactEmail, contactNumber, discordWebhookUrl } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (category !== undefined) updates.category = category;
        if (description !== undefined) updates.description = description;
        if (contactEmail !== undefined) updates.contactEmail = contactEmail;
        if (contactNumber !== undefined) updates.contactNumber = contactNumber;
        if (discordWebhookUrl !== undefined) updates.discordWebhookUrl = discordWebhookUrl;

        const organizer = await Organizer.findByIdAndUpdate(req.user.id, updates, { new: true });
        if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

        res.json({ message: 'Profile updated', organizer });
    } catch (err) {
        console.error('Update organizer profile error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/organizer/password-reset-request
 * Request a password reset (handled by admin)
 */
const requestPasswordReset = async (req, res) => {
    try {
        // Check if there's already a pending request
        const existingRequest = await PasswordResetRequest.findOne({
            organizer: req.user.id,
            status: 'pending',
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'You already have a pending password reset request' });
        }

        const resetRequest = new PasswordResetRequest({
            organizer: req.user.id,
        });

        await resetRequest.save();

        res.status(201).json({ message: 'Password reset request submitted', request: resetRequest });
    } catch (err) {
        console.error('Password reset request error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/organizer/events/:id/merch-orders
 * List merchandise orders with payment proofs
 */
const getMerchOrders = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user.id });
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.type !== 'merchandise') {
            return res.status(400).json({ message: 'Not a merchandise event' });
        }

        const orders = await Registration.find({ event: event._id })
            .populate('participant', 'firstName lastName email contactNumber')
            .sort({ registeredAt: -1 });

        res.json({ orders });
    } catch (err) {
        console.error('Get merch orders error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/organizer/events/:id/merch-orders/:orderId/approve
 * Approve a merchandise order — decrement stock, generate ticket, send email
 */
const approveOrder = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user.id });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const registration = await Registration.findById(req.params.orderId)
            .populate('participant', 'firstName lastName email');
        if (!registration) return res.status(404).json({ message: 'Order not found' });
        if (registration.paymentStatus !== 'pending_approval') {
            return res.status(400).json({ message: 'Order is not in pending approval state' });
        }

        // Decrement stock
        let totalCost = 0;
        for (const sel of registration.merchandiseSelections) {
            const item = event.merchandiseItems.id(sel.itemId);
            if (item) {
                if (item.stockQuantity < sel.quantity) {
                    return res.status(400).json({ message: `Insufficient stock for ${item.name}` });
                }
                item.stockQuantity -= sel.quantity;
                totalCost += item.price * sel.quantity;
            }
        }
        await event.save();

        // Generate ticket
        const ticketId = `TKT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        const qrCode = await generateQR(ticketId);

        registration.status = 'confirmed';
        registration.paymentStatus = 'approved';
        registration.ticketId = ticketId;
        registration.qrCode = qrCode;
        await registration.save();

        // Update event counters
        event.registrationCount += 1;
        event.registrationsLast24h += 1;
        event.totalRevenue += totalCost;
        await event.save();

        // Send approval email
        const participant = registration.participant;
        try {
            await sendMerchApprovalEmail(participant.email, {
                participantName: `${participant.firstName} ${participant.lastName}`,
                eventName: event.name,
                ticketId,
                qrCode,
                status: 'approved',
            });
        } catch (emailErr) {
            console.error('Approval email failed:', emailErr);
        }

        res.json({ message: 'Order approved, ticket generated', registration });
    } catch (err) {
        console.error('Approve order error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/organizer/events/:id/merch-orders/:orderId/reject
 * Reject a merchandise order
 */
const rejectOrder = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user.id });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const registration = await Registration.findById(req.params.orderId)
            .populate('participant', 'firstName lastName email');
        if (!registration) return res.status(404).json({ message: 'Order not found' });
        if (registration.paymentStatus !== 'pending_approval') {
            return res.status(400).json({ message: 'Order is not in pending approval state' });
        }

        registration.status = 'rejected';
        registration.paymentStatus = 'rejected';
        await registration.save();

        // Send rejection email
        const participant = registration.participant;
        try {
            await sendMerchApprovalEmail(participant.email, {
                participantName: `${participant.firstName} ${participant.lastName}`,
                eventName: event.name,
                status: 'rejected',
            });
        } catch (emailErr) {
            console.error('Rejection email failed:', emailErr);
        }

        res.json({ message: 'Order rejected', registration });
    } catch (err) {
        console.error('Reject order error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getDashboard,
    createEvent,
    getEventDetail,
    updateEvent,
    publishEvent,
    closeEvent,
    getParticipants,
    getProfile,
    updateProfile,
    requestPasswordReset,
    getMerchOrders,
    approveOrder,
    rejectOrder,
};
