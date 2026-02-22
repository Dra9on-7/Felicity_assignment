const mongoose = require('mongoose');

const managementSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['participant', 'organizer', 'admin'],
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  // Common fields
  name: String,
  
  // Participant fields
  firstName: String,
  lastName: String,
  participantType: {
    type: String,
    enum: ['IIIT', 'Non-IIIT'],
  },
  phoneNumber: String,
  collegeName: String,
  
  // Organizer fields
  OrgName: String,
  organizerName: String,
  clubName: String,
  councilName: String,
  organizerType: String,
  category: String,
  description: String,
  contactEmail: String,
  contactNumber: String,
  discordWebhook: String,
  discordWebhookUrl: String,
  notifyOnRegistration: {
    type: Boolean,
    default: true,
  },
  notifyOnCancellation: {
    type: Boolean,
    default: true,
  },
  notifyOnEventStart: {
    type: Boolean,
    default: true,
  },
  socialLinks: {
    website: String,
    instagram: String,
    twitter: String,
    linkedin: String,
    discord: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['active', 'disabled'],
    default: 'active',
  },
  passwordResetRequested: {
    type: Boolean,
    default: false,
  },
  passwordResetRequestedAt: Date,
  
  // Admin fields
  adminName: String,
  privileges: String,
}, { timestamps: true });

// Virtual for full name
managementSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.name || this.organizerName || this.adminName || 'Unknown';
});

// Ensure virtuals are included when converting to JSON
managementSchema.set('toJSON', { virtuals: true });
managementSchema.set('toObject', { virtuals: true });

// Pre-save hook to sync discordWebhook and discordWebhookUrl
managementSchema.pre('save', function(next) {
  if (this.isModified('discordWebhookUrl') && this.discordWebhookUrl) {
    this.discordWebhook = this.discordWebhookUrl;
  } else if (this.isModified('discordWebhook') && this.discordWebhook) {
    this.discordWebhookUrl = this.discordWebhook;
  }
  next();
});

module.exports = mongoose.model('Management', managementSchema, 'Management');