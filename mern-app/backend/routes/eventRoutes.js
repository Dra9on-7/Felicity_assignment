const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Management = require('../models/Management');

/**
 * Public Event Routes
 * These routes are accessible to all users (with optional auth for personalization)
 */

// Get all published events with filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      search,
      category,
      eventType,
      organizer,
      startDate,
      endDate,
      sortBy = 'startDateTime',
      sortOrder = 'asc',
      page = 1,
      limit = 10
    } = req.query;

    // Build filter
    const filter = { status: { $in: ['published', 'ongoing'] } };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (eventType) {
      filter.eventType = eventType;
    }

    if (organizer) {
      filter.organizer = organizer;
    }

    if (startDate || endDate) {
      filter.startDateTime = {};
      if (startDate) filter.startDateTime.$gte = new Date(startDate);
      if (endDate) filter.startDateTime.$lte = new Date(endDate);
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('organizer', 'name clubName councilName organizerType')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Event.countDocuments(filter)
    ]);

    // If user is authenticated, add registration status
    if (req.user) {
      const registrations = await Registration.find({
        participant: req.user._id,
        event: { $in: events.map(e => e._id) }
      });

      const registrationMap = {};
      registrations.forEach(r => {
        registrationMap[r.event.toString()] = r.status;
      });

      events.forEach(event => {
        const status = registrationMap[event._id.toString()];
        event.isRegistered = status === 'registered' || status === 'pending';
        event.registrationStatus = status || null;
      });
    }

    res.json({
      success: true,
      data: events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching events',
      error: error.message
    });
  }
});

// Get trending events (top 5 by registrations in last 24 hours)
router.get('/trending', async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get registration counts per event in last 24 hours
    const trendingData = await Registration.aggregate([
      {
        $match: {
          registeredAt: { $gte: twentyFourHoursAgo }
        }
      },
      {
        $group: {
          _id: '$event',
          recentRegistrations: { $sum: 1 }
        }
      },
      {
        $sort: { recentRegistrations: -1 }
      },
      {
        $limit: 5
      }
    ]);

    const eventIds = trendingData.map(t => t._id);
    
    const events = await Event.find({
      _id: { $in: eventIds },
      status: { $in: ['published', 'ongoing'] }
    })
      .populate('organizer', 'name clubName councilName organizerType')
      .lean();

    // Add registration count to events
    const registrationMap = {};
    trendingData.forEach(t => {
      registrationMap[t._id.toString()] = t.recentRegistrations;
    });

    const trendingEvents = events.map(event => ({
      ...event,
      recentRegistrations: registrationMap[event._id.toString()] || 0
    })).sort((a, b) => b.recentRegistrations - a.recentRegistrations);

    res.json({
      success: true,
      data: trendingEvents
    });
  } catch (error) {
    console.error('Error fetching trending events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trending events',
      error: error.message
    });
  }
});

// Get event categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Event.distinct('category', { status: { $in: ['published', 'ongoing'] } });
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

// Get all organizers (clubs/councils)
router.get('/organizers', async (req, res) => {
  try {
    const organizers = await Management.find({
      role: 'organizer',
      isActive: true
    })
      .select('name clubName councilName organizerType email')
      .lean();

    res.json({
      success: true,
      data: organizers
    });
  } catch (error) {
    console.error('Error fetching organizers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching organizers',
      error: error.message
    });
  }
});

// Get organizer details with their events
router.get('/organizers/:organizerId', async (req, res) => {
  try {
    const { organizerId } = req.params;

    const organizer = await Management.findOne({
      _id: organizerId,
      role: 'organizer',
      isActive: true
    })
      .select('name clubName councilName organizerType email description')
      .lean();

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    // Get organizer's published events
    const events = await Event.find({
      organizer: organizerId,
      status: { $in: ['published', 'ongoing'] }
    })
      .sort({ startDateTime: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        organizer,
        events
      }
    });
  } catch (error) {
    console.error('Error fetching organizer details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching organizer details',
      error: error.message
    });
  }
});

// Get single event details
router.get('/:eventId', optionalAuth, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findOne({
      _id: eventId,
      status: { $in: ['published', 'ongoing'] }
    })
      .populate('organizer', 'name clubName councilName organizerType email description')
      .lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Get registration count
    const registrationCount = await Registration.countDocuments({
      event: eventId,
      status: 'registered'
    });

    event.registrationCount = registrationCount;
    event.spotsRemaining = event.maxParticipants 
      ? event.maxParticipants - registrationCount 
      : null;

    // If user is authenticated, check if they're registered
    if (req.user) {
      const registration = await Registration.findOne({
        participant: req.user._id,
        event: eventId
      }).sort({ registeredAt: -1 });

      event.isRegistered = registration?.status === 'registered' || registration?.status === 'pending';
      event.registrationStatus = registration?.status || null;
      event.registrationId = registration?._id || null;
      event.paymentStatus = registration?.paymentStatus || null;
      event.paymentRejectionReason = registration?.paymentRejectionReason || null;
      event.qrCode = registration?.qrCode || null;
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event details',
      error: error.message
    });
  }
});

module.exports = router;
