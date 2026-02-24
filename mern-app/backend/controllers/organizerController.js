const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Management = require('../models/Management');
const { sendEventCreatedEmail, sendEventPublishedEmail, sendEventCancelledToParticipants, sendEventEndedEarlyEmail } = require('../utils/emailService');
const { notifyEventPublished } = require('../utils/discordWebhook');

/**
 * Organizer Controller
 * Handles organizer-specific operations for the Felicity Event Management System
 */

// Get organizer dashboard data
exports.getDashboard = async (req, res) => {
    try {
        const organizerId = req.user._id;

        // Get events carousel (all organizer events)
        const events = await Event.find({ organizerId }).sort({ createdAt: -1 });
        
        // Calculate analytics
        const publishedEvents = events.filter(e => e.status === 'published' || e.status === 'ongoing').length;
        const draftEvents = events.filter(e => e.status === 'draft').length;
        const upcomingEvents = events.filter(e => 
            (e.status === 'published' || e.status === 'ongoing') && new Date(e.eventStartDate) > new Date()
        ).length;
        const ongoingEvents = events.filter(e => {
            const now = new Date();
            return (e.status === 'published' || e.status === 'ongoing') && 
                   new Date(e.eventStartDate) <= now && new Date(e.eventEndDate) >= now;
        });

        // Total registrations across all events
        const eventIds = events.map(e => e._id);
        const allRegistrations = await Registration.find({ eventId: { $in: eventIds } });
        const totalRegistrations = allRegistrations.length;

        // Revenue calculation (sum of paymentAmount for approved payments)
        const totalRevenue = allRegistrations
            .filter(r => r.paymentStatus === 'approved' || r.status === 'registered')
            .reduce((sum, r) => sum + (r.paymentAmount || 0), 0);

        // Merchandise sales count
        const merchandiseSales = allRegistrations
            .filter(r => r.merchandiseDetails && r.merchandiseDetails.length > 0 && r.paymentStatus === 'approved')
            .length;

        // Attendance stats
        const attendedCount = allRegistrations.filter(r => r.attendedAt || r.status === 'attended').length;

        return res.status(200).json({
            events,
            analytics: {
                totalEvents: events.length,
                publishedEvents,
                draftEvents,
                upcomingEvents,
                ongoingEvents: ongoingEvents.length,
                totalRegistrations,
                totalRevenue,
                merchandiseSales,
                attendedCount
            }
        });
    } catch (error) {
        console.error('Error fetching organizer dashboard:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Get ongoing events for organizer
exports.getOngoingEvents = async (req, res) => {
    try {
        const organizerId = req.user._id;
        const now = new Date();

        // Match events that are actively happening:
        // - status 'ongoing' (auto-transitioned by cron), OR
        // - status 'published' with start date passed and end date not yet passed
        const events = await Event.find({
            organizerId,
            status: { $in: ['published', 'ongoing'] },
            // eventStartDate: { $lte: now },
            eventEndDate: { $gte: now }
        });

        return res.status(200).json({ events });
    } catch (error) {
        console.error('Error fetching ongoing events:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Create new event (draft or published)
exports.createEvent = async (req, res) => {
    try {
        const organizerId = req.user._id;
        const {
            eventName,
            eventDescription,
            eventType,
            category,
            eligibility,
            registrationDeadline,
            eventStartDate,
            eventEndDate,
            registrationLimit,
            registrationFee,
            venue,
            eventTags,
            status,
            registrationFormFields,
            merchandiseDetails,
            customFormFields
        } = req.body;

        if (!eventName || !eventType) {
            return res.status(400).json({ message: 'Event name and type are required' });
        }

        // Date validation
        const now = new Date();
        if (eventStartDate) {
            if (new Date(eventStartDate) < now) {
                return res.status(400).json({ message: 'Event start date cannot be in the past' });
            }
        }
        if (eventEndDate) {
            if (new Date(eventEndDate) < now) {
                return res.status(400).json({ message: 'Event end date cannot be in the past' });
            }
            if (eventStartDate && new Date(eventEndDate) <= new Date(eventStartDate)) {
                return res.status(400).json({ message: 'Event end date must be after start date' });
            }
        }
        if (registrationDeadline) {
            if (new Date(registrationDeadline) < now) {
                return res.status(400).json({ message: 'Registration deadline cannot be in the past' });
            }
            if (eventStartDate && new Date(registrationDeadline) > new Date(eventStartDate)) {
                return res.status(400).json({ message: 'Registration deadline must be before event start date' });
            }
        }

        const event = new Event({
            eventName,
            eventDescription,
            eventType,
            category: category || 'General',
            eligibility,
            registrationDeadline,
            eventStartDate,
            eventEndDate,
            registrationLimit,
            registrationFee,
            venue,
            organizerId,
            eventTags,
            status: status || 'draft',
            registrationFormFields: eventType === 'normal' ? registrationFormFields : [],
            customFormFields: eventType === 'normal' ? customFormFields : [],
            merchandiseDetails: eventType === 'merchandise' ? merchandiseDetails : []
        });

        await event.save();

        // Send event creation email to organizer
        const organizer = await Management.findById(organizerId).select('email organizerName clubName councilName contactEmail');
        if (organizer) {
            sendEventCreatedEmail({
                organizerEmail: organizer.contactEmail || organizer.email,
                organizerName: organizer.organizerName || organizer.clubName || organizer.councilName || 'Organizer',
                eventName,
                eventType,
                status: status || 'draft',
            }).catch(err => console.error('Failed to send event created email:', err.message));
        }

        return res.status(201).json({ 
            message: 'Event created successfully',
            event 
        });
    } catch (error) {
        console.error('Error creating event:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Get single event with details (organizer view)
exports.getEventDetails = async (req, res) => {
    try {
        const { eventId } = req.params;
        const organizerId = req.user._id;

        const event = await Event.findOne({ _id: eventId, organizerId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        // Get registration count and analytics
        const registrations = await Registration.find({ eventId });
        const registeredCount = registrations.filter(r => r.status === 'registered').length;
        const attendedCount = registrations.filter(r => r.status === 'attended').length;
        const cancelledCount = registrations.filter(r => r.status === 'cancelled').length;

        return res.status(200).json({
            data: event,
            analytics: {
                totalRegistrations: registrations.length,
                registered: registeredCount,
                attended: attendedCount,
                cancelled: cancelledCount
            }
        });
    } catch (error) {
        console.error('Error fetching event details:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Update event
exports.updateEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const organizerId = req.user._id;
        const updates = req.body;

        const event = await Event.findOne({ _id: eventId, organizerId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        // Check editing rules: published events have restrictions
        if (event.status === 'published') {
            // Once published, certain fields cannot be changed
            const restrictedFields = ['eventType', 'registrationLimit'];
            const attemptedRestricted = restrictedFields.filter(f => updates[f] !== undefined && updates[f] !== event[f]);
            
            if (attemptedRestricted.length > 0) {
                return res.status(400).json({ 
                    message: `Cannot modify ${attemptedRestricted.join(', ')} after event is published` 
                });
            }
        }

        // Form Locking: prevent editing registration form after first registration
        if (updates.customFormFields || updates.registrationFormFields) {
            const existingRegistrations = await Registration.countDocuments({ event: eventId });
            if (existingRegistrations > 0) {
                return res.status(400).json({
                    message: 'Cannot modify registration form after participants have registered. Form is locked.'
                });
            }
        }

        // Apply allowed updates
        const allowedUpdates = [
            'eventName', 'eventDescription', 'eligibility', 
            'registrationDeadline', 'eventStartDate', 'eventEndDate',
            'registrationFee', 'eventTags', 'registrationFormFields',
            'customFormFields', 'merchandiseDetails'
        ];

        // Allow status change from draft to published (not reverse)
        if (updates.status === 'published' && event.status === 'draft') {
            event.status = 'published';
        }

        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                event[field] = updates[field];
            }
        });

        await event.save();

        return res.status(200).json({ 
            message: 'Event updated successfully',
            event 
        });
    } catch (error) {
        console.error('Error updating event:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Publish event (change from draft to published)
exports.publishEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const organizerId = req.user._id;

        const event = await Event.findOne({ _id: eventId, organizerId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        if (event.status === 'published') {
            return res.status(400).json({ message: 'Event is already published' });
        }

        // Validation before publishing
        if (!event.eventStartDate || !event.eventEndDate || !event.registrationDeadline) {
            return res.status(400).json({ 
                message: 'Event must have start date, end date, and registration deadline before publishing' 
            });
        }

        event.status = 'published';
        await event.save();

        // Send publish email to organizer
        const organizer = await Management.findById(organizerId).select('email organizerName clubName councilName contactEmail');
        if (organizer) {
            sendEventPublishedEmail({
                organizerEmail: organizer.contactEmail || organizer.email,
                organizerName: organizer.organizerName || organizer.clubName || organizer.councilName || 'Organizer',
                eventName: event.eventName,
                eventStartDate: event.eventStartDate,
            }).catch(err => console.error('Failed to send event published email:', err.message));
        }

        // Send Discord webhook notification for new event published
        notifyEventPublished({
            organizerId,
            eventName: event.eventName || event.name,
            eventType: event.eventType,
            startDate: event.eventStartDate,
            venue: event.venue,
            description: event.eventDescription || event.description,
        }).catch(err => console.error('Discord publish notification failed:', err.message));

        return res.status(200).json({ 
            message: 'Event published successfully',
            event 
        });
    } catch (error) {
        console.error('Error publishing event:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Delete event (only drafts can be deleted)
exports.deleteEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const organizerId = req.user._id;

        const event = await Event.findOne({ _id: eventId, organizerId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        if (event.status === 'published') {
            return res.status(400).json({ message: 'Cannot delete published events' });
        }

        await Event.findByIdAndDelete(eventId);

        return res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Get event participants list
exports.getEventParticipants = async (req, res) => {
    try {
        const { eventId } = req.params;
        const organizerId = req.user._id;

        const event = await Event.findOne({ _id: eventId, organizerId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        const registrations = await Registration.find({ eventId })
            .populate('participantId', 'firstName lastName email contactNumber participantType OrgName')
            .sort({ createdAt: -1 });

        return res.status(200).json({ 
            event: { id: event._id, name: event.eventName },
            participants: registrations 
        });
    } catch (error) {
        console.error('Error fetching event participants:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Export participants as CSV data
exports.exportParticipantsCSV = async (req, res) => {
    try {
        const { eventId } = req.params;
        const organizerId = req.user._id;

        const event = await Event.findOne({ _id: eventId, organizerId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        const registrations = await Registration.find({ eventId })
            .populate('participantId', 'firstName lastName email contactNumber participantType OrgName');

        // Generate CSV data
        const headers = ['First Name', 'Last Name', 'Email', 'Contact', 'Type', 'Organization', 'Status', 'Registered At'];
        const rows = registrations.map(reg => [
            reg.participantId?.firstName || '',
            reg.participantId?.lastName || '',
            reg.participantId?.email || '',
            reg.participantId?.contactNumber || '',
            reg.participantId?.participantType || '',
            reg.participantId?.OrgName || '',
            reg.status,
            reg.createdAt.toISOString()
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${event.eventName.replace(/\s+/g, '_')}_participants.csv`);
        return res.send(csv);
    } catch (error) {
        console.error('Error exporting participants:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Get organizer profile
exports.getProfile = async (req, res) => {
    try {
        const organizerId = req.user._id;
        const organizer = await Management.findById(organizerId).select('-password');

        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        return res.status(200).json({ data: organizer });
    } catch (error) {
        console.error('Error fetching organizer profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Update organizer profile
exports.updateProfile = async (req, res) => {
    try {
        const organizerId = req.user._id;
        const { organizerName, clubName, councilName, category, description, contactEmail, socialLinks, discordWebhook } = req.body;

        const organizer = await Management.findById(organizerId);
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        if (organizerName) organizer.organizerName = organizerName;
        if (clubName) organizer.clubName = clubName;
        if (councilName !== undefined) organizer.councilName = councilName;
        if (category) organizer.category = category;
        if (description !== undefined) organizer.description = description;
        if (contactEmail) organizer.contactEmail = contactEmail;
        if (socialLinks) organizer.socialLinks = socialLinks;
        if (discordWebhook !== undefined) organizer.discordWebhook = discordWebhook;

        await organizer.save();

        return res.status(200).json({ 
            message: 'Profile updated successfully',
            data: organizer
        });
    } catch (error) {
        console.error('Error updating organizer profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Request password reset (organizer submits request to admin)
exports.requestPasswordReset = async (req, res) => {
    try {
        const organizerId = req.user._id;

        const organizer = await Management.findById(organizerId);
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        organizer.passwordResetRequested = true;
        organizer.passwordResetRequestedAt = new Date();

        await organizer.save();

        return res.status(200).json({ 
            message: 'Password reset request submitted. Admin will process your request.' 
        });
    } catch (error) {
        console.error('Error requesting password reset:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Get event analytics (detailed)
exports.getEventAnalytics = async (req, res) => {
    try {
        const { eventId } = req.params;
        const organizerId = req.user._id;

        const event = await Event.findOne({ _id: eventId, organizerId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        const registrations = await Registration.find({ eventId });
        
        // Registration timeline (grouped by date)
        const registrationsByDate = {};
        registrations.forEach(reg => {
            const date = reg.createdAt.toISOString().split('T')[0];
            registrationsByDate[date] = (registrationsByDate[date] || 0) + 1;
        });

        // Status breakdown
        const statusBreakdown = {
            registered: registrations.filter(r => r.status === 'registered').length,
            attended: registrations.filter(r => r.status === 'attended').length,
            cancelled: registrations.filter(r => r.status === 'cancelled').length
        };

        // Capacity utilization
        const capacityUtilization = event.registrationLimit 
            ? Math.round((registrations.length / event.registrationLimit) * 100)
            : null;

        return res.status(200).json({
            data: {
                totalRegistrations: registrations.length,
                confirmedRegistrations: registrations.filter(r => r.status === 'registered' || r.status === 'confirmed').length,
                pendingRegistrations: registrations.filter(r => r.status === 'pending').length,
                cancelledRegistrations: registrations.filter(r => r.status === 'cancelled').length,
                registrationsByDay: registrationsByDate,
                pageViews: event.pageViews || 0,
                statusBreakdown,
                capacityUtilization,
                registrationLimit: event.registrationLimit
            }
        });
    } catch (error) {
        console.error('Error fetching event analytics:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Cancel event
exports.cancelEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const organizerId = req.user._id;

        const event = await Event.findOne({ _id: eventId, organizerId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        event.status = 'cancelled';
        await event.save();

        // Get registered participants before cancelling
        const registrations = await Registration.find({ eventId, status: { $ne: 'cancelled' } })
            .populate('participantId', 'email firstName lastName name');

        // Cancel all registrations
        await Registration.updateMany(
            { eventId, status: { $ne: 'cancelled' } },
            { status: 'cancelled' }
        );

        // Send cancellation emails to all registered participants
        const organizer = await Management.findById(organizerId).select('organizerName clubName councilName');
        const organizerDisplayName = organizer?.organizerName || organizer?.clubName || organizer?.councilName || 'Organizer';
        const participants = registrations
            .filter(r => r.participantId?.email)
            .map(r => ({
                email: r.participantId.email,
                name: r.participantId.firstName 
                    ? `${r.participantId.firstName} ${r.participantId.lastName || ''}`.trim()
                    : r.participantId.name || 'Participant',
            }));

        if (participants.length > 0) {
            sendEventCancelledToParticipants({
                participants,
                eventName: event.eventName || event.name,
                organizerName: organizerDisplayName,
            }).catch(err => console.error('Failed to send cancellation emails:', err.message));
        }

        return res.status(200).json({
            message: 'Event cancelled successfully',
            data: event
        });
    } catch (error) {
        console.error('Error cancelling event:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// End event early (mark as completed before scheduled end)
exports.endEventEarly = async (req, res) => {
    try {
        const { eventId } = req.params;
        const organizerId = req.user._id;

        const event = await Event.findOne({ _id: eventId, organizerId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        if (event.status !== 'published' && event.status !== 'ongoing') {
            return res.status(400).json({ message: 'Only published or ongoing events can be ended early' });
        }

        event.status = 'completed';
        event.eventEndDate = new Date();
        event.endDateTime = new Date();
        await event.save();

        // Get registered participants
        const registrations = await Registration.find({ eventId, status: 'registered' })
            .populate('participantId', 'email firstName lastName name');

        const organizer = await Management.findById(organizerId).select('email organizerName clubName councilName contactEmail');
        const organizerDisplayName = organizer?.organizerName || organizer?.clubName || organizer?.councilName || 'Organizer';

        const participants = registrations
            .filter(r => r.participantId?.email)
            .map(r => ({
                email: r.participantId.email,
                name: r.participantId.firstName 
                    ? `${r.participantId.firstName} ${r.participantId.lastName || ''}`.trim()
                    : r.participantId.name || 'Participant',
            }));

        // Send ended-early emails
        sendEventEndedEarlyEmail({
            participants,
            eventName: event.eventName || event.name,
            organizerName: organizerDisplayName,
            organizerEmail: organizer?.contactEmail || organizer?.email,
        }).catch(err => console.error('Failed to send event-ended emails:', err.message));

        return res.status(200).json({
            message: 'Event ended early successfully',
            data: event
        });
    } catch (error) {
        console.error('Error ending event early:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Get event registrations
exports.getEventRegistrations = async (req, res) => {
    try {
        const { eventId } = req.params;
        const organizerId = req.user._id;

        const event = await Event.findOne({ _id: eventId, organizerId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        const registrations = await Registration.find({ eventId })
            .populate('participantId', 'name email phoneNumber')
            .sort({ createdAt: -1 });

        const formattedRegistrations = registrations.map(reg => ({
            _id: reg._id,
            participant: reg.participantId,
            status: reg.status,
            registeredAt: reg.createdAt,
            customFields: reg.customFields
        }));

        return res.status(200).json({ data: formattedRegistrations });
    } catch (error) {
        console.error('Error fetching event registrations:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Update registration status
exports.updateRegistrationStatus = async (req, res) => {
    try {
        const { eventId, registrationId } = req.params;
        const { status } = req.body;
        const organizerId = req.user._id;

        const event = await Event.findOne({ _id: eventId, organizerId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        const registration = await Registration.findOneAndUpdate(
            { _id: registrationId, eventId },
            { status },
            { new: true }
        );

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        return res.status(200).json({
            message: 'Registration status updated',
            data: registration
        });
    } catch (error) {
        console.error('Error updating registration status:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        const organizerId = req.user._id;
        const { currentPassword, newPassword } = req.body;
        const bcrypt = require('bcryptjs');

        const organizer = await Management.findById(organizerId);
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, organizer.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        organizer.password = await bcrypt.hash(newPassword, salt);
        await organizer.save();

        return res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Update webhook settings
exports.updateWebhookSettings = async (req, res) => {
    try {
        const organizerId = req.user._id;
        const { discordWebhookUrl, notifyOnRegistration, notifyOnCancellation, notifyOnEventStart } = req.body;

        const organizer = await Management.findById(organizerId);
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        organizer.discordWebhookUrl = discordWebhookUrl;
        organizer.notifyOnRegistration = notifyOnRegistration;
        organizer.notifyOnCancellation = notifyOnCancellation;
        organizer.notifyOnEventStart = notifyOnEventStart;
        await organizer.save();

        return res.status(200).json({ message: 'Webhook settings updated successfully' });
    } catch (error) {
        console.error('Error updating webhook settings:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Test webhook
exports.testWebhook = async (req, res) => {
    try {
        const { webhookUrl } = req.body;

        if (!webhookUrl) {
            return res.status(400).json({ message: 'Webhook URL is required' });
        }

        // Send test message to Discord webhook
        const axios = require('axios');
        await axios.post(webhookUrl, {
            embeds: [{
                title: '🔔 Test Notification',
                description: 'This is a test message from the Felicity Event Management System.',
                color: 0x667eea,
                timestamp: new Date().toISOString()
            }]
        });

        return res.status(200).json({ message: 'Test message sent successfully' });
    } catch (error) {
        console.error('Error testing webhook:', error);
        return res.status(400).json({ message: 'Failed to send test message. Check your webhook URL.' });
    }
};
