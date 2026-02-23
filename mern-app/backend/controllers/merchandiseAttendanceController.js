const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Management = require('../models/Management');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Merchandise Payment Approval Controller (Tier A Feature)
 * Handles payment proof upload, approval, and rejection workflows
 */

// Multer config for payment proof uploads
const uploadsDir = path.join(__dirname, '..', 'uploads', 'payment-proofs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `payment-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP and PDF are allowed.'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

/**
 * Upload payment proof for merchandise registration
 */
exports.uploadPaymentProof = [
  upload.single('paymentProof'),
  async (req, res) => {
    try {
      const { registrationId } = req.params;

      const registration = await Registration.findOne({
        _id: registrationId,
        participant: req.user._id,
        paymentStatus: { $in: ['pending_approval', 'rejected'] },
      });

      if (!registration) {
        return res.status(404).json({ success: false, message: 'Registration not found or not awaiting payment' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload a payment proof image or PDF' });
      }

      registration.paymentProofUrl = `/uploads/payment-proofs/${req.file.filename}`;
      registration.paymentStatus = 'pending_approval';
      await registration.save();

      res.json({
        success: true,
        message: 'Payment proof uploaded successfully. Awaiting organizer approval.',
        data: { paymentProofUrl: registration.paymentProofUrl }
      });
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
  }
];

/**
 * Get merchandise orders for an organizer's event
 */
exports.getMerchandiseOrders = async (req, res) => {
  try {
    const { eventId } = req.params;
    const organizerId = req.user._id;

    const event = await Event.findOne({ _id: eventId, organizerId });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or unauthorized' });
    }

    const orders = await Registration.find({
      event: eventId,
      'merchandiseDetails': { $exists: true, $ne: null },
    })
      .populate('participant', 'firstName lastName email participantType')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching merchandise orders:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Approve a merchandise payment
 */
exports.approvePayment = async (req, res) => {
  try {
    const { eventId, registrationId } = req.params;
    const organizerId = req.user._id;

    const event = await Event.findOne({ _id: eventId, organizerId });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or unauthorized' });
    }

    const registration = await Registration.findOne({
      _id: registrationId,
      event: eventId,
      paymentStatus: 'pending_approval',
    });

    if (!registration) {
      return res.status(404).json({ success: false, message: 'Order not found or not pending approval' });
    }

    // Decrement stock upon approval
    if (registration.merchandiseDetails && registration.merchandiseDetails.length > 0) {
      for (const detail of registration.merchandiseDetails) {
        const item = event.merchandiseItems.id(detail.itemId);
        if (item) {
          if (item.stock < (detail.quantity || 1)) {
            return res.status(400).json({
              success: false,
              message: `Not enough stock for ${item.name}. Available: ${item.stock}`
            });
          }
          item.stock -= (detail.quantity || 1);
        }
      }
      await event.save();
    }

    // Generate QR code now that payment is approved
    const registrationData = {
      eventId,
      eventName: event.name || event.eventName,
      participantId: registration.participant,
      registrationId: registration._id,
      ticketId: registration.ticketId,
      approvedAt: new Date(),
    };
    const qrCode = await QRCode.toDataURL(JSON.stringify(registrationData));

    registration.paymentStatus = 'approved';
    registration.status = 'registered';
    registration.paymentReviewedBy = organizerId;
    registration.paymentReviewedAt = new Date();
    registration.qrCode = qrCode;
    registration.ticket = { qrCode, issuedAt: new Date() };
    await registration.save();

    res.json({
      success: true,
      message: 'Payment approved. QR code has been generated for the participant.',
      data: registration,
    });
  } catch (error) {
    console.error('Error approving payment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Reject a merchandise payment
 */
exports.rejectPayment = async (req, res) => {
  try {
    const { eventId, registrationId } = req.params;
    const { reason } = req.body;
    const organizerId = req.user._id;

    const event = await Event.findOne({ _id: eventId, organizerId });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or unauthorized' });
    }

    const registration = await Registration.findOne({
      _id: registrationId,
      event: eventId,
      paymentStatus: 'pending_approval',
    });

    if (!registration) {
      return res.status(404).json({ success: false, message: 'Order not found or not pending approval' });
    }

    registration.paymentStatus = 'rejected';
    registration.paymentRejectionReason = reason || 'Payment proof not acceptable';
    registration.paymentReviewedBy = organizerId;
    registration.paymentReviewedAt = new Date();
    await registration.save();

    res.json({
      success: true,
      message: 'Payment rejected.',
      data: registration,
    });
  } catch (error) {
    console.error('Error rejecting payment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * QR Scanner & Attendance Tracking Controller (Tier A Feature)
 */

/**
 * Mark attendance by scanning QR code
 */
exports.markAttendance = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { qrData } = req.body;
    const organizerId = req.user._id;

    // Verify event belongs to organizer
    const event = await Event.findOne({ _id: eventId, organizerId });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or unauthorized' });
    }

    // Parse QR data
    let parsed;
    try {
      parsed = JSON.parse(qrData);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid QR code data' });
    }

    // Verify QR is for this event
    if (parsed.eventId !== eventId) {
      return res.status(400).json({ success: false, message: 'QR code is for a different event' });
    }

    // Find the registration
    const registration = await Registration.findOne({
      event: eventId,
      participant: parsed.participantId,
      status: { $in: ['registered', 'attended'] },
    }).populate('participant', 'firstName lastName email participantType');

    if (!registration) {
      return res.status(404).json({ success: false, message: 'No valid registration found for this QR code' });
    }

    // Check for duplicate scan
    if (registration.status === 'attended') {
      return res.status(409).json({
        success: false,
        message: `Already checked in at ${new Date(registration.attendedAt).toLocaleString()}`,
        data: {
          participant: registration.participant,
          attendedAt: registration.attendedAt,
          duplicate: true,
        },
      });
    }

    // Mark attended
    registration.status = 'attended';
    registration.attendedAt = new Date();
    registration.markedBy = organizerId;
    registration.attendanceMethod = 'qr_scan';
    await registration.save();

    res.json({
      success: true,
      message: 'Attendance marked successfully!',
      data: {
        participant: registration.participant,
        attendedAt: registration.attendedAt,
      },
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Manual attendance override
 */
exports.manualAttendance = async (req, res) => {
  try {
    const { eventId, registrationId } = req.params;
    const organizerId = req.user._id;

    const event = await Event.findOne({ _id: eventId, organizerId });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or unauthorized' });
    }

    const registration = await Registration.findOne({
      _id: registrationId,
      event: eventId,
      status: { $in: ['registered', 'attended'] },
    });

    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    if (registration.status === 'attended') {
      return res.status(400).json({ success: false, message: 'Already marked as attended' });
    }

    registration.status = 'attended';
    registration.attendedAt = new Date();
    registration.markedBy = organizerId;
    registration.attendanceMethod = 'manual';
    await registration.save();

    res.json({
      success: true,
      message: 'Attendance marked manually.',
      data: registration,
    });
  } catch (error) {
    console.error('Error manual attendance:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get live attendance stats
 */
exports.getAttendanceStats = async (req, res) => {
  try {
    const { eventId } = req.params;
    const organizerId = req.user._id;

    const event = await Event.findOne({ _id: eventId, organizerId });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or unauthorized' });
    }

    const registrations = await Registration.find({ event: eventId, status: { $ne: 'cancelled' } })
      .populate('participant', 'firstName lastName email participantType');

    const total = registrations.length;
    const attended = registrations.filter(r => r.status === 'attended').length;
    const notAttended = registrations.filter(r => r.status === 'registered').length;

    // Recent check-ins (last 10)
    const recentCheckIns = registrations
      .filter(r => r.status === 'attended')
      .sort((a, b) => new Date(b.attendedAt) - new Date(a.attendedAt))
      .slice(0, 10)
      .map(r => ({
        _id: r._id,
        participant: r.participant,
        attendedAt: r.attendedAt,
        attendanceMethod: r.attendanceMethod,
      }));

    res.json({
      success: true,
      data: {
        total,
        attended,
        notAttended,
        attendanceRate: total > 0 ? Math.round((attended / total) * 100) : 0,
        recentCheckIns,
        registrations: registrations.map(r => ({
          _id: r._id,
          participant: r.participant,
          status: r.status,
          attendedAt: r.attendedAt,
          attendanceMethod: r.attendanceMethod,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Export attendance data as CSV
 */
exports.exportAttendanceCSV = async (req, res) => {
  try {
    const { eventId } = req.params;
    const organizerId = req.user._id;

    const event = await Event.findOne({ _id: eventId, organizerId });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or unauthorized' });
    }

    const registrations = await Registration.find({ event: eventId, status: { $ne: 'cancelled' } })
      .populate('participant', 'firstName lastName email participantType');

    const headers = ['Name', 'Email', 'Type', 'Registration Status', 'Attended', 'Check-in Time', 'Method'];
    const rows = registrations.map(r => [
      `${r.participant?.firstName || ''} ${r.participant?.lastName || ''}`.trim() || 'N/A',
      r.participant?.email || 'N/A',
      r.participant?.participantType || 'N/A',
      r.status,
      r.status === 'attended' ? 'Yes' : 'No',
      r.attendedAt ? new Date(r.attendedAt).toISOString() : '',
      r.attendanceMethod || '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${eventId}.csv`);
    return res.send(csv);
  } catch (error) {
    console.error('Error exporting attendance CSV:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
