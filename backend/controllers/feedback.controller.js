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
        const { rating, comment, isAnonymous } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        // Verify event is completed
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.status !== 'completed' && event.status !== 'ongoing') {
            return res.status(400).json({ message: 'Feedback can only be submitted for ongoing or completed events' });
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
            isAnonymous: isAnonymous !== false, // default to anonymous
        });

        await feedback.save();

        res.status(201).json({ message: isAnonymous !== false ? 'Feedback submitted anonymously!' : 'Feedback submitted!', feedback: { rating: feedback.rating } });
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
            .populate('participant', 'firstName lastName')
            .sort({ createdAt: -1 })
            .lean();

        // Strip participant info for anonymous feedbacks
        const sanitizedFeedbacks = feedbacks.map((fb) => ({
            rating: fb.rating,
            comment: fb.comment,
            createdAt: fb.createdAt,
            isAnonymous: fb.isAnonymous !== false,
            participant: fb.isAnonymous === false && fb.participant
                ? { firstName: fb.participant.firstName, lastName: fb.participant.lastName }
                : null,
        }));

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
            feedbacks: sanitizedFeedbacks,
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
