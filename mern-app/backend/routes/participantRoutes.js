const express = require('express');
const router = express.Router();
const { auth, participantOnly } = require('../middleware/auth');
const participantController = require('../controllers/participantController');

/**
 * Participant Routes
 * All routes require authentication and participant role
 */

// Profile management
router.get('/profile', auth, participantOnly, participantController.getProfile);
router.put('/profile', auth, participantOnly, participantController.updateProfile);

// Preferences
router.get('/preferences', auth, participantOnly, participantController.getPreferences);
router.put('/preferences', auth, participantOnly, participantController.updatePreferences);

// Club following
router.post('/clubs/:organizerId/follow', auth, participantOnly, participantController.followClub);
router.delete('/clubs/:organizerId/follow', auth, participantOnly, participantController.unfollowClub);
router.get('/clubs/following', auth, participantOnly, participantController.getFollowedClubs);

// Event registration
router.post('/events/:eventId/register', auth, participantOnly, participantController.registerForEvent);
router.delete('/events/:eventId/register', auth, participantOnly, participantController.cancelRegistration);
router.get('/events/registered', auth, participantOnly, participantController.getRegisteredEvents);

// Dashboard
router.get('/dashboard', auth, participantOnly, participantController.getDashboard);

// Password change
router.put('/change-password', auth, participantOnly, participantController.changePassword);

module.exports = router;
