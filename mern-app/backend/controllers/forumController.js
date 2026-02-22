const Message = require('../models/Message');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

/**
 * Discussion Forum Controller (Tier B Feature)
 * Handles real-time discussion forum for events
 */

/**
 * Get messages for an event forum
 */
exports.getMessages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check event exists and is published/ongoing
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Get pinned messages first, then regular messages
    const messages = await Message.find({ event: eventId, isDeleted: false })
      .populate('author', 'firstName lastName email role clubName councilName organizerName participantType')
      .populate('parentMessage', 'content author')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({ event: eventId, isDeleted: false });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // oldest first for chat display
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Post a new message (REST fallback — primary via Socket.IO)
 */
exports.postMessage = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { content, parentMessageId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ success: false, message: 'Message too long (max 2000 chars)' });
    }

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if user is organizer of this event or a registered participant
    const isOrganizer = event.organizerId?.toString() === req.user._id.toString() ||
                        event.organizer?.toString() === req.user._id.toString();
    
    if (!isOrganizer && req.user.role === 'participant') {
      const registration = await Registration.findOne({
        participant: req.user._id,
        event: eventId,
        status: { $in: ['registered', 'attended'] },
      });
      if (!registration) {
        return res.status(403).json({ success: false, message: 'You must be registered for this event to post in the forum' });
      }
    }

    const message = new Message({
      event: eventId,
      author: req.user._id,
      content: content.trim(),
      parentMessage: parentMessageId || null,
      isAnnouncement: isOrganizer && req.body.isAnnouncement,
    });

    await message.save();
    await message.populate('author', 'firstName lastName email role clubName councilName organizerName participantType');

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Error posting message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Toggle pin on a message (organizer only)
 */
exports.togglePin = async (req, res) => {
  try {
    const { eventId, messageId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Only organizer of this event can pin
    const isOrganizer = event.organizerId?.toString() === req.user._id.toString() ||
                        event.organizer?.toString() === req.user._id.toString();
    if (!isOrganizer && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the event organizer can pin messages' });
    }

    const message = await Message.findOne({ _id: messageId, event: eventId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    message.isPinned = !message.isPinned;
    await message.save();

    res.json({ success: true, data: message, message: message.isPinned ? 'Message pinned' : 'Message unpinned' });
  } catch (error) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Delete a message (organizer moderation or own message)
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { eventId, messageId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const message = await Message.findOne({ _id: messageId, event: eventId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const isOrganizer = event.organizerId?.toString() === req.user._id.toString() ||
                        event.organizer?.toString() === req.user._id.toString();
    const isAuthor = message.author.toString() === req.user._id.toString();

    if (!isOrganizer && !isAuthor && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this message' });
    }

    message.isDeleted = true;
    message.deletedBy = req.user._id;
    await message.save();

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Toggle reaction on a message
 */
exports.toggleReaction = async (req, res) => {
  try {
    const { eventId, messageId } = req.params;
    const { emoji } = req.body;

    const allowedEmojis = ['👍', '❤️', '🎉', '😂', '🤔', '👏'];
    if (!allowedEmojis.includes(emoji)) {
      return res.status(400).json({ success: false, message: 'Invalid emoji' });
    }

    const message = await Message.findOne({ _id: messageId, event: eventId, isDeleted: false });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const existingIndex = message.reactions.findIndex(
      r => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingIndex > -1) {
      message.reactions.splice(existingIndex, 1); // Remove reaction
    } else {
      message.reactions.push({ user: req.user._id, emoji });
    }

    await message.save();

    res.json({ success: true, data: message.reactions });
  } catch (error) {
    console.error('Error toggling reaction:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
