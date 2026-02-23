const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const adminController = require('../controllers/admin.controller');

// All admin routes require authentication + admin role
router.use(verifyToken, requireRole('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Organizer Management
router.post('/organizers', adminController.createOrganizer);
router.get('/organizers', adminController.listOrganizers);
router.put('/organizers/:id/disable', adminController.disableOrganizer);
router.delete('/organizers/:id', adminController.deleteOrganizer);

// Password Reset Requests
router.get('/password-resets', adminController.getPasswordResets);
router.post('/password-resets/:id/approve', adminController.approvePasswordReset);
router.post('/password-resets/:id/reject', adminController.rejectPasswordReset);

module.exports = router;
