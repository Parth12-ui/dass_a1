const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const forumController = require('../controllers/forum.controller');

// All forum routes require authentication (participant or organizer)
router.use(verifyToken, requireRole('participant', 'organizer'));

// Messages
router.get('/:eventId/messages', forumController.getMessages);
router.post('/:eventId/messages', forumController.postMessage);

// Moderation
router.delete('/messages/:id', forumController.deleteMessage);
router.put('/messages/:id/pin', forumController.pinMessage);
router.post('/messages/:id/react', forumController.reactToMessage);

module.exports = router;
