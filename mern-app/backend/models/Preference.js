const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema({
  participantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Management',
    required: true,
  },
  areasOfInterest: [String],
  followedClubs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Management',
  }],
}, { timestamps: true });

module.exports = mongoose.model('Preference', preferenceSchema, 'Preferences');