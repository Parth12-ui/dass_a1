const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const organizerController = require('../controllers/organizer.controller');

// All organizer routes require authentication + organizer role
router.use(verifyToken, requireRole('organizer'));

// Dashboard
router.get('/dashboard', organizerController.getDashboard);

// Events CRUD
router.post('/events', organizerController.createEvent);
router.get('/events/:id', organizerController.getEventDetail);
router.put('/events/:id', organizerController.updateEvent);
router.put('/events/:id/publish', organizerController.publishEvent);
router.put('/events/:id/close', organizerController.closeEvent);

// Participants
router.get('/events/:id/participants', organizerController.getParticipants);

// Merch order management
router.get('/events/:id/merch-orders', organizerController.getMerchOrders);
router.post('/events/:id/merch-orders/:orderId/approve', organizerController.approveOrder);
router.post('/events/:id/merch-orders/:orderId/reject', organizerController.rejectOrder);

// Profile
router.get('/profile', organizerController.getProfile);
router.put('/profile', organizerController.updateProfile);

// Password reset request
router.post('/password-reset-request', organizerController.requestPasswordReset);

module.exports = router;
