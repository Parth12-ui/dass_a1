const crypto = require('crypto');
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const { generateCredentials } = require('../utils/generateCredentials');
const { sendCredentialsEmail, sendPasswordResetEmail } = require('../utils/email');

/**
 * GET /api/admin/dashboard
 * Platform overview stats
 */
const getDashboard = async (req, res) => {
    try {
        const totalParticipants = await User.countDocuments();
        const totalOrganizers = await Organizer.countDocuments({ isActive: true });
        const totalEvents = await Event.countDocuments();
        const totalRegistrations = await Registration.countDocuments();
        const pendingResets = await PasswordResetRequest.countDocuments({ status: 'pending' });

        const eventsByStatusArr = await Event.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        // Convert array to object for frontend: { draft: 3, published: 5, ... }
        const eventsByStatus = {};
        for (const entry of eventsByStatusArr) {
            eventsByStatus[entry._id] = entry.count;
        }

        res.json({
            totalParticipants,
            totalOrganizers,
            totalEvents,
            totalRegistrations,
            pendingPasswordResets: pendingResets,
            eventsByStatus,
        });
    } catch (err) {
        console.error('Admin dashboard error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/admin/organizers
 * Create a new organizer (auto-generate credentials)
 */
const createOrganizer = async (req, res) => {
    try {
        const { name, category, description, contactEmail, contactNumber } = req.body;

        if (!name || !category) {
            return res.status(400).json({ message: 'Name and category are required' });
        }

        // Generate login credentials
        const { loginEmail, password } = generateCredentials(name);

        const organizer = new Organizer({
            name,
            category,
            description: description || '',
            contactEmail: contactEmail || '',
            contactNumber: contactNumber || '',
            loginEmail,
            password, // will be hashed by pre-save hook
        });

        await organizer.save();

        // Send credentials email
        try {
            await sendCredentialsEmail(contactEmail || loginEmail, {
                loginEmail,
                password,
                organizerName: name,
            });
        } catch (emailErr) {
            console.error('Credentials email failed:', emailErr);
        }

        res.status(201).json({
            message: 'Organizer created successfully',
            organizer: organizer.toJSON(),
            credentials: {
                loginEmail,
                password, // returned once; admin can share with organizer
            },
        });
    } catch (err) {
        console.error('Create organizer error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/admin/organizers
 * List all organizers
 */
const listOrganizers = async (req, res) => {
    try {
        const organizers = await Organizer.find().sort({ createdAt: -1 });
        res.json(organizers);
    } catch (err) {
        console.error('List organizers error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PUT /api/admin/organizers/:id/disable
 * Disable/archive organizer (soft-delete)
 */
const disableOrganizer = async (req, res) => {
    try {
        const organizer = await Organizer.findById(req.params.id);
        if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

        organizer.isActive = !organizer.isActive; // toggle
        await organizer.save();

        res.json({
            message: organizer.isActive ? 'Organizer re-enabled' : 'Organizer disabled',
            organizer,
        });
    } catch (err) {
        console.error('Disable organizer error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * DELETE /api/admin/organizers/:id
 * Permanently delete organizer
 */
const deleteOrganizer = async (req, res) => {
    try {
        const organizer = await Organizer.findById(req.params.id);
        if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

        // Option: also clean up events and registrations
        await Event.deleteMany({ organizer: organizer._id });
        await Registration.deleteMany({
            event: { $in: await Event.find({ organizer: organizer._id }).distinct('_id') },
        });

        await Organizer.findByIdAndDelete(req.params.id);

        res.json({ message: 'Organizer permanently deleted' });
    } catch (err) {
        console.error('Delete organizer error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/admin/password-resets
 * View pending password reset requests
 */
const getPasswordResets = async (req, res) => {
    try {
        const requests = await PasswordResetRequest.find()
            .populate('organizer', 'name loginEmail contactEmail')
            .sort({ requestedAt: -1 });

        res.json(requests);
    } catch (err) {
        console.error('Get password resets error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/admin/password-resets/:id/approve
 * Approve password reset — generate new password
 */
const approvePasswordReset = async (req, res) => {
    try {
        const resetRequest = await PasswordResetRequest.findById(req.params.id).populate('organizer');
        if (!resetRequest) return res.status(404).json({ message: 'Request not found' });

        if (resetRequest.status !== 'pending') {
            return res.status(400).json({ message: 'Request has already been processed' });
        }

        // Generate new password
        const newPassword = crypto.randomBytes(8).toString('base64').slice(0, 12);

        // Update organizer's password
        const organizer = await Organizer.findById(resetRequest.organizer._id);
        organizer.password = newPassword; // pre-save hook will hash
        await organizer.save();

        // Update request
        resetRequest.status = 'approved';
        resetRequest.newPassword = newPassword;
        resetRequest.resolvedAt = new Date();
        await resetRequest.save();

        // Send new password via email
        try {
            await sendPasswordResetEmail(organizer.contactEmail || organizer.loginEmail, {
                organizerName: organizer.name,
                newPassword,
            });
        } catch (emailErr) {
            console.error('Password reset email failed:', emailErr);
        }

        res.json({
            message: 'Password reset approved',
            newPassword, // admin can also share manually
        });
    } catch (err) {
        console.error('Approve password reset error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/admin/password-resets/:id/reject
 * Reject password reset request
 */
const rejectPasswordReset = async (req, res) => {
    try {
        const resetRequest = await PasswordResetRequest.findById(req.params.id);
        if (!resetRequest) return res.status(404).json({ message: 'Request not found' });

        if (resetRequest.status !== 'pending') {
            return res.status(400).json({ message: 'Request has already been processed' });
        }

        resetRequest.status = 'rejected';
        resetRequest.resolvedAt = new Date();
        await resetRequest.save();

        res.json({ message: 'Password reset request rejected' });
    } catch (err) {
        console.error('Reject password reset error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getDashboard,
    createOrganizer,
    listOrganizers,
    disableOrganizer,
    deleteOrganizer,
    getPasswordResets,
    approvePasswordReset,
    rejectPasswordReset,
};
