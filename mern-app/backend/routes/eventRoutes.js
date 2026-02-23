const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Management = require('../models/Management');
const Preference = require('../models/Preference');

/**
 * Fuzzy matching helper — Levenshtein distance
 */
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyMatch(text, query, threshold = 0.4) {
  if (!text || !query) return false;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t.includes(q)) return true;
  // Check each word
  const words = t.split(/\s+/);
  for (const word of words) {
    const dist = levenshtein(word, q);
    if (dist / Math.max(word.length, q.length) <= threshold) return true;
  }
  return false;
}

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
      eligibility,
      startDate,
      endDate,
      followedOnly,
      sortBy = 'startDateTime',
      sortOrder = 'asc',
      page = 1,
      limit = 10
    } = req.query;

    // Build filter
    const filter = { status: { $in: ['published', 'ongoing'] } };

    if (search) {
      // Build regex for partial matching on event fields
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: { $regex: searchRegex } },
        { eventName: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } }
      ];

      // Also search by organizer name — find matching organizer IDs
      const matchingOrganizers = await Management.find({
        role: 'organizer',
        $or: [
          { clubName: { $regex: searchRegex } },
          { councilName: { $regex: searchRegex } },
          { organizerName: { $regex: searchRegex } },
          { name: { $regex: searchRegex } }
        ]
      }).select('_id');
      
      if (matchingOrganizers.length > 0) {
        filter.$or.push({ organizer: { $in: matchingOrganizers.map(o => o._id) } });
        filter.$or.push({ organizerId: { $in: matchingOrganizers.map(o => o._id) } });
      }
    }

    if (category) {
      filter.category = category;
    }

    if (eventType) {
      filter.eventType = eventType;
    }

    if (eligibility && eligibility !== 'all') {
      filter.eligibility = eligibility;
    }

    if (organizer) {
      filter.organizer = organizer;
    }

    // Followed clubs filter
    if (followedOnly === 'true' && req.user) {
      const prefs = await Preference.findOne({ participantId: req.user._id });
      if (prefs?.followedClubs?.length > 0) {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            { organizer: { $in: prefs.followedClubs } },
            { organizerId: { $in: prefs.followedClubs } }
          ]
        });
      }
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
    
    let [events, total] = await Promise.all([
      Event.find(filter)
        .populate('organizer', 'name clubName councilName organizerType category')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Event.countDocuments(filter)
    ]);

    // Fuzzy search: if search query provided, also do a post-filter fuzzy match
    // to catch near-misses not found by regex
    if (search && events.length < parseInt(limit)) {
      // Get additional events that regex might have missed
      const allEvents = await Event.find({ status: { $in: ['published', 'ongoing'] } })
        .populate('organizer', 'name clubName councilName organizerType category')
        .lean();
      
      const existingIds = new Set(events.map(e => e._id.toString()));
      const fuzzyMatches = allEvents.filter(evt => {
        if (existingIds.has(evt._id.toString())) return false;
        const orgName = evt.organizer?.clubName || evt.organizer?.councilName || evt.organizer?.name || '';
        return fuzzyMatch(evt.name || evt.eventName || '', search) ||
               fuzzyMatch(orgName, search);
      });
      
      events = [...events, ...fuzzyMatches.slice(0, parseInt(limit) - events.length)];
      total = total + fuzzyMatches.length;
    }

    // Preferences-based ordering: boost events matching user interests/followed clubs
    if (req.user) {
      const prefs = await Preference.findOne({ participantId: req.user._id });
      if (prefs) {
        const followedSet = new Set((prefs.followedClubs || []).map(id => id.toString()));
        const interests = (prefs.areasOfInterest || []).map(i => i.toLowerCase());
        
        events.forEach(event => {
          let score = 0;
          // Boost if organizer is followed
          const orgId = (event.organizer?._id || event.organizerId || '').toString();
          if (followedSet.has(orgId)) score += 10;
          // Boost if category matches interest
          const eventCat = (event.category || '').toLowerCase();
          const eventTags = (event.tags || []).map(t => t.toLowerCase());
          for (const interest of interests) {
            if (eventCat.includes(interest) || interest.includes(eventCat)) score += 5;
            if (eventTags.some(t => t.includes(interest) || interest.includes(t))) score += 3;
          }
          event._preferenceScore = score;
        });

        // Stable sort: preference score descending, then original order
        events.sort((a, b) => (b._preferenceScore || 0) - (a._preferenceScore || 0));
      }

      // Add registration status
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
        delete event._preferenceScore;
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

    // Get organizer's published, ongoing, and completed events
    const events = await Event.find({
      organizer: organizerId,
      status: { $in: ['published', 'ongoing', 'completed'] }
    })
      .sort({ startDateTime: -1 })
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
