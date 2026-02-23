const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const feedbackController = require('../controllers/feedback.controller');

// Participant: submit feedback
router.post('/:eventId', verifyToken, requireRole('participant'), feedbackController.submitFeedback);
router.get('/:eventId/check', verifyToken, requireRole('participant'), feedbackController.checkFeedback);

// Organizer: view feedback
router.get('/:eventId', verifyToken, requireRole('organizer'), feedbackController.getEventFeedback);

module.exports = router;
