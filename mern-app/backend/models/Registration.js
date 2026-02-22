const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  // Support both naming conventions
  participant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Management',
  },
  participantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Management',
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  },

  // Registration form answers
  registrationData: mongoose.Schema.Types.Mixed,
  formResponses: mongoose.Schema.Types.Mixed,

  // QR code & ticket (support both flat and nested)
  qrCode: String,
  ticket: {
    qrCode: String,
    issuedAt: Date,
  },

  // Merchandise purchases
  merchandiseDetails: [{
    itemId: mongoose.Schema.Types.ObjectId,
    name: String,
    variant: String,
    quantity: { type: Number, default: 1 },
    price: Number,
  }],
  merchandiseSelections: mongoose.Schema.Types.Mixed,

  // Payment Approval Workflow (Tier A)
  paymentStatus: {
    type: String,
    enum: ['not_required', 'pending_approval', 'approved', 'rejected'],
    default: 'not_required',
  },
  paymentProofUrl: String,
  paymentAmount: Number,
  paymentReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Management',
  },
  paymentReviewedAt: Date,
  paymentRejectionReason: String,

  // Attendance tracking (Tier A)
  attendedAt: Date,
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Management',
  },
  attendanceMethod: {
    type: String,
    enum: ['qr_scan', 'manual'],
  },

  // Status
  status: {
    type: String,
    enum: ['registered', 'cancelled', 'attended', 'pending'],
    default: 'registered',
  },

  registeredAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Pre-save: sync field names
registrationSchema.pre('save', function(next) {
  if (this.participantId && !this.participant) this.participant = this.participantId;
  if (this.participant && !this.participantId) this.participantId = this.participant;
  
  if (this.eventId && !this.event) this.event = this.eventId;
  if (this.event && !this.eventId) this.eventId = this.event;
  
  // Sync QR code
  if (this.qrCode && !this.ticket?.qrCode) {
    this.ticket = { qrCode: this.qrCode, issuedAt: new Date() };
  }
  if (this.ticket?.qrCode && !this.qrCode) {
    this.qrCode = this.ticket.qrCode;
  }
  
  next();
});

registrationSchema.set('toJSON', { virtuals: true });
registrationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Registration', registrationSchema, 'Registerations');
