const mongoose = require('mongoose');

/**
 * Message Model - For Real-Time Discussion Forum (Tier B)
 */
const messageSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Management',
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  // Threading support
  parentMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  // Moderation
  isPinned: {
    type: Boolean,
    default: false,
  },
  isAnnouncement: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Management',
  },
  // Reactions
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Management' },
    emoji: { type: String, enum: ['👍', '❤️', '🎉', '😂', '🤔', '👏'] },
  }],
}, { timestamps: true });

messageSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema, 'Messages');
