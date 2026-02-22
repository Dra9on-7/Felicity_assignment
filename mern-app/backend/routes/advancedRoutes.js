const express = require('express');
const router = express.Router();
const { auth, organizerOnly, participantOnly } = require('../middleware/auth');
const merchandiseAttendanceController = require('../controllers/merchandiseAttendanceController');
const forumController = require('../controllers/forumController');

/**
 * Advanced Feature Routes
 * Merchandise Payment (Tier A), QR Attendance (Tier A), Discussion Forum (Tier B)
 */

// ========================
// MERCHANDISE PAYMENT WORKFLOW (Participant)
// ========================
// Upload payment proof
router.post(
  '/registrations/:registrationId/payment-proof',
  auth,
  participantOnly,
  merchandiseAttendanceController.uploadPaymentProof
);

// ========================
// MERCHANDISE PAYMENT WORKFLOW (Organizer)
// ========================
// Get merchandise orders for event
router.get(
  '/organizer/events/:eventId/merchandise-orders',
  auth,
  organizerOnly,
  merchandiseAttendanceController.getMerchandiseOrders
);

// Approve payment
router.post(
  '/organizer/events/:eventId/orders/:registrationId/approve',
  auth,
  organizerOnly,
  merchandiseAttendanceController.approvePayment
);

// Reject payment
router.post(
  '/organizer/events/:eventId/orders/:registrationId/reject',
  auth,
  organizerOnly,
  merchandiseAttendanceController.rejectPayment
);

// ========================
// QR SCANNER & ATTENDANCE (Organizer)
// ========================
// Mark attendance via QR scan
router.post(
  '/organizer/events/:eventId/attendance/scan',
  auth,
  organizerOnly,
  merchandiseAttendanceController.markAttendance
);

// Manual attendance override
router.post(
  '/organizer/events/:eventId/attendance/:registrationId/manual',
  auth,
  organizerOnly,
  merchandiseAttendanceController.manualAttendance
);

// Get attendance stats
router.get(
  '/organizer/events/:eventId/attendance',
  auth,
  organizerOnly,
  merchandiseAttendanceController.getAttendanceStats
);

// Export attendance CSV
router.get(
  '/organizer/events/:eventId/attendance/export',
  auth,
  organizerOnly,
  merchandiseAttendanceController.exportAttendanceCSV
);

// ========================
// DISCUSSION FORUM (Authenticated users)
// ========================
// Get forum messages
router.get(
  '/events/:eventId/forum',
  auth,
  forumController.getMessages
);

// Post a message
router.post(
  '/events/:eventId/forum',
  auth,
  forumController.postMessage
);

// Toggle pin (organizer moderation)
router.patch(
  '/events/:eventId/forum/:messageId/pin',
  auth,
  forumController.togglePin
);

// Delete message (moderation)
router.delete(
  '/events/:eventId/forum/:messageId',
  auth,
  forumController.deleteMessage
);

// Toggle reaction
router.post(
  '/events/:eventId/forum/:messageId/react',
  auth,
  forumController.toggleReaction
);

module.exports = router;
