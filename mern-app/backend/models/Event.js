const mongoose = require('mongoose');

const merchandiseItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  size: String,
  color: String,
  variants: [String],
  price: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  stockQty: Number,
  purchaseLimit: { type: Number, default: 1 },
});

const customFieldSchema = new mongoose.Schema({
  label: { type: String, required: true },
  type: { type: String, enum: ['text', 'textarea', 'select', 'checkbox', 'number', 'email', 'phone', 'file'], default: 'text' },
  required: { type: Boolean, default: false },
  options: [String],
  placeholder: String,
}, { _id: true });

const eventSchema = new mongoose.Schema({
  // Core fields (match both old and new naming)
  name: { type: String },
  eventName: { type: String },
  description: { type: String },
  eventDescription: { type: String },
  eventType: {
    type: String,
    enum: ['normal', 'merchandise'],
    required: true,
    default: 'normal',
  },
  category: { type: String, default: 'General' },
  eligibility: { type: String, default: 'all' },

  // Dates
  startDateTime: Date,
  endDateTime: Date,
  eventStartDate: Date,
  eventEndDate: Date,
  eventDate: Date,
  startTime: String,
  endTime: String,
  registrationDeadline: Date,

  // Limits
  maxParticipants: Number,
  registrationLimit: Number,
  maxCapacity: Number,
  registrationFee: { type: Number, default: 0 },

  // Location
  venue: { type: String, default: '' },

  // Organizer (support both field names)
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Management',
  },
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Management',
  },

  // Tags & metadata
  tags: [String],
  eventTags: [String],
  image: String,

  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'ongoing', 'cancelled', 'completed'],
    default: 'draft',
  },
  eventStatus: {
    type: String,
    enum: ['draft', 'published', 'ongoing', 'cancelled', 'completed'],
    default: 'draft',
  },

  // Custom registration form
  customFormFields: [customFieldSchema],
  registrationFormFields: [String],

  // Merchandise
  merchandiseItems: [merchandiseItemSchema],
  merchandiseDetails: [merchandiseItemSchema],
}, { timestamps: true });

// Virtuals to normalize field access
eventSchema.virtual('effectiveName').get(function() {
  return this.name || this.eventName || 'Unnamed Event';
});

// Pre-save: sync field names
eventSchema.pre('save', function(next) {
  // Sync name fields
  if (this.eventName && !this.name) this.name = this.eventName;
  if (this.name && !this.eventName) this.eventName = this.name;
  
  // Sync description
  if (this.eventDescription && !this.description) this.description = this.eventDescription;
  if (this.description && !this.eventDescription) this.eventDescription = this.description;
  
  // Sync dates
  if (this.eventStartDate && !this.startDateTime) this.startDateTime = this.eventStartDate;
  if (this.startDateTime && !this.eventStartDate) this.eventStartDate = this.startDateTime;
  if (this.eventEndDate && !this.endDateTime) this.endDateTime = this.eventEndDate;
  if (this.endDateTime && !this.eventEndDate) this.endDateTime = this.endDateTime;
  
  // Sync limits
  if (this.registrationLimit && !this.maxParticipants) this.maxParticipants = this.registrationLimit;
  if (this.maxParticipants && !this.registrationLimit) this.registrationLimit = this.maxParticipants;
  if (this.maxCapacity && !this.maxParticipants) this.maxParticipants = this.maxCapacity;
  
  // Sync organizer
  if (this.organizerId && !this.organizer) this.organizer = this.organizerId;
  if (this.organizer && !this.organizerId) this.organizerId = this.organizer;
  
  // Sync tags
  if (this.eventTags?.length && !this.tags?.length) this.tags = this.eventTags;
  if (this.tags?.length && !this.eventTags?.length) this.eventTags = this.tags;
  
  // Sync status
  if (this.eventStatus && !this.status) this.status = this.eventStatus;
  if (this.status) this.eventStatus = this.status;

  // Sync merchandise
  if (this.merchandiseDetails?.length && !this.merchandiseItems?.length) this.merchandiseItems = this.merchandiseDetails;
  if (this.merchandiseItems?.length && !this.merchandiseDetails?.length) this.merchandiseDetails = this.merchandiseItems;

  next();
});

eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

// Compute effective status based on current time
eventSchema.methods.getComputedStatus = function() {
  // Cancelled and completed are final states - never override
  if (this.status === 'cancelled' || this.status === 'completed') {
    return this.status;
  }
  // Draft events stay draft
  if (this.status === 'draft') {
    return 'draft';
  }
  // For published/ongoing, check time-based transitions
  const now = new Date();
  const start = this.eventStartDate || this.startDateTime;
  const end = this.eventEndDate || this.endDateTime;
  if (start && now >= start && (!end || now <= end)) {
    return 'ongoing';
  }
  if (end && now > end) {
    return 'completed';
  }
  return 'published';
};

// Static: auto-update statuses for all published/ongoing events
eventSchema.statics.updateEventStatuses = async function() {
  const now = new Date();
  // published -> ongoing (start time has passed)
  await this.updateMany(
    { status: 'published', eventStartDate: { $lte: now } },
    { $set: { status: 'ongoing', eventStatus: 'ongoing' } }
  );
  // ongoing -> completed (end time has passed)
  await this.updateMany(
    { status: 'ongoing', eventEndDate: { $lte: now } },
    { $set: { status: 'completed', eventStatus: 'completed' } }
  );
};

module.exports = mongoose.model('Event', eventSchema, 'Events');
