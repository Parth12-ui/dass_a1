const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const participantController = require('../controllers/participant.controller');

// All participant routes require authentication + participant role
router.use(verifyToken, requireRole('participant'));

// Dashboard
router.get('/dashboard', participantController.getDashboard);

// Profile
router.get('/profile', participantController.getProfile);
router.put('/profile', participantController.updateProfile);

// Browse Events
router.get('/browse', participantController.browseEvents);

// Event Detail
router.get('/events/:id', participantController.getEventDetail);

// Event Registration (Normal)
router.post('/events/:id/register', participantController.registerForEvent);

// Merchandise Purchase
router.post('/events/:id/purchase', participantController.purchaseMerchandise);

// Payment proof upload
router.post('/events/:id/payment-proof', participantController.uploadPaymentProof);

// Ticket
router.get('/tickets/:id', participantController.getTicket);

// Organizers
router.get('/organizers', participantController.listOrganizers);
router.get('/organizers/:id', participantController.getOrganizerDetail);
router.post('/organizers/:id/follow', participantController.toggleFollow);

module.exports = router;
