const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

/**
 * Admin Routes
 * All routes require authentication and admin role
 */

// Dashboard
router.get('/dashboard', auth, adminOnly, adminController.getDashboardStats);

// Organizer management
router.post('/organizers', auth, adminOnly, adminController.createOrganizer);
router.get('/organizers', auth, adminOnly, adminController.getAllOrganizers);
router.put('/organizers/:organizerId', auth, adminOnly, adminController.updateOrganizer);
router.patch('/organizers/:organizerId/status', auth, adminOnly, adminController.updateOrganizerStatus);
router.patch('/organizers/:organizerId/toggle-status', auth, adminOnly, adminController.toggleOrganizerStatus);
router.delete('/organizers/:organizerId', auth, adminOnly, adminController.deleteOrganizer);

// Password reset management
router.get('/password-reset-requests', auth, adminOnly, adminController.getPasswordResetRequests);
router.post('/organizers/:organizerId/reset-password', auth, adminOnly, adminController.resetOrganizerPassword);
router.get('/generate-password', auth, adminOnly, adminController.generatePassword);

// View all participants
router.get('/participants', auth, adminOnly, adminController.getAllParticipants);

// View all events
router.get('/events', auth, adminOnly, adminController.getAllEvents);

// Initialize admin (should be called only once during setup)
router.post('/initialize', adminController.initializeAdmin);

module.exports = router;
