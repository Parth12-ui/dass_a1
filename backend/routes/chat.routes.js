const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const chatController = require('../controllers/chat.controller');

// All chat routes require participant auth
router.use(verifyToken, requireRole('participant'));

router.get('/:teamId/messages', chatController.getHistory);
router.post('/:teamId/messages', chatController.sendMessage);
router.post('/:teamId/upload', chatController.uploadFile);

module.exports = router;
