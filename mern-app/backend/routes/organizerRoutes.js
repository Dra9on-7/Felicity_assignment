const express = require('express');
const router = express.Router();
const { auth, organizerOnly } = require('../middleware/auth');
const organizerController = require('../controllers/organizerController');

/**
 * Organizer Routes
 * All routes require authentication and organizer role
 */

// Dashboard
router.get('/dashboard', auth, organizerOnly, organizerController.getDashboard);
router.get('/ongoing-events', auth, organizerOnly, organizerController.getOngoingEvents);

// Event management
router.post('/events', auth, organizerOnly, organizerController.createEvent);
router.get('/events/:eventId', auth, organizerOnly, organizerController.getEventDetails);
router.put('/events/:eventId', auth, organizerOnly, organizerController.updateEvent);
router.delete('/events/:eventId', auth, organizerOnly, organizerController.deleteEvent);
router.post('/events/:eventId/publish', auth, organizerOnly, organizerController.publishEvent);
router.post('/events/:eventId/cancel', auth, organizerOnly, organizerController.cancelEvent);
router.post('/events/:eventId/end-early', auth, organizerOnly, organizerController.endEventEarly);

// Event participants/registrations
router.get('/events/:eventId/participants', auth, organizerOnly, organizerController.getEventParticipants);
router.get('/events/:eventId/registrations', auth, organizerOnly, organizerController.getEventRegistrations);
router.put('/events/:eventId/registrations/:registrationId', auth, organizerOnly, organizerController.updateRegistrationStatus);
router.get('/events/:eventId/participants/export', auth, organizerOnly, organizerController.exportParticipantsCSV);

// Event analytics
router.get('/events/:eventId/analytics', auth, organizerOnly, organizerController.getEventAnalytics);

// Profile
router.get('/profile', auth, organizerOnly, organizerController.getProfile);
router.put('/profile', auth, organizerOnly, organizerController.updateProfile);
router.put('/change-password', auth, organizerOnly, organizerController.changePassword);

// Webhook
router.put('/webhook', auth, organizerOnly, organizerController.updateWebhookSettings);
router.post('/webhook/test', auth, organizerOnly, organizerController.testWebhook);

// Password reset request
router.post('/request-password-reset', auth, organizerOnly, organizerController.requestPasswordReset);

module.exports = router;
