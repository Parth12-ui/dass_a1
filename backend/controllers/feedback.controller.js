const Feedback = require('../models/Feedback');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

/**
 * POST /api/feedback/:eventId
 * Submit anonymous feedback for an attended event
 */
const submitFeedback = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        // Verify event is completed
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.status !== 'completed') {
            return res.status(400).json({ message: 'Feedback can only be submitted for completed events' });
        }

        // Verify user was registered
        const reg = await Registration.findOne({ event: eventId, participant: req.user.id, status: 'confirmed' });
        if (!reg) {
            return res.status(403).json({ message: 'You must have attended this event to give feedback' });
        }

        // Check for existing feedback
        const existing = await Feedback.findOne({ event: eventId, participant: req.user.id });
        if (existing) {
            return res.status(409).json({ message: 'You have already submitted feedback for this event' });
        }

        const feedback = new Feedback({
            event: eventId,
            participant: req.user.id,
            rating: Math.round(rating),
            comment: comment || '',
        });

        await feedback.save();

        res.status(201).json({ message: 'Feedback submitted anonymously!', feedback: { rating: feedback.rating } });
    } catch (err) {
        console.error('Submit feedback error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/feedback/:eventId
 * Get aggregated feedback for an event (organizer view — anonymous)
 */
const getEventFeedback = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { minRating } = req.query;

        const filter = { event: eventId };
        if (minRating) filter.rating = { $gte: parseInt(minRating) };

        const feedbacks = await Feedback.find(filter)
            .select('rating comment createdAt -_id') // anonymous: no participant info
            .sort({ createdAt: -1 })
            .lean();

        // Aggregate stats
        const allFeedbacks = await Feedback.find({ event: eventId }).lean();
        const totalCount = allFeedbacks.length;
        const avgRating = totalCount > 0
            ? (allFeedbacks.reduce((sum, f) => sum + f.rating, 0) / totalCount).toFixed(1)
            : 0;

        // Star breakdown
        const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        allFeedbacks.forEach((f) => { breakdown[f.rating]++; });

        res.json({
            feedbacks,
            stats: { totalCount, avgRating: parseFloat(avgRating), breakdown },
        });
    } catch (err) {
        console.error('Get event feedback error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/feedback/:eventId/check
 * Check if current user has submitted feedback
 */
const checkFeedback = async (req, res) => {
    try {
        const existing = await Feedback.findOne({
            event: req.params.eventId,
            participant: req.user.id,
        });
        res.json({ hasSubmitted: !!existing });
    } catch (err) {
        console.error('Check feedback error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    submitFeedback,
    getEventFeedback,
    checkFeedback,
};
