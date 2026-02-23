const Management = require('../models/Management');
const Preference = require('../models/Preference');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const bcrypt = require('bcrypt');
const QRCode = require('qrcode');
const { sendEventRegistrationConfirmation, sendEventCancellationEmail } = require('../utils/emailService');
const { notifyNewRegistration, notifyRegistrationCancelled } = require('../utils/discordWebhook');

/**
 * Participant Controller
 * Handles all participant-related operations using auth middleware
 */

// Profile Management
exports.getProfile = async (req, res) => {
    try {
        const participant = await Management.findById(req.user._id).select('-password');
        if (!participant) {
            return res.status(404).json({ success: false, message: 'Participant not found' });
        }

        const preferences = await Preference.findOne({ participantId: req.user._id });

        res.json({ 
            success: true, 
            data: { 
                participant, 
                preferences 
            } 
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, phoneNumber, collegeName } = req.body;
        
        const participant = await Management.findById(req.user._id);
        if (!participant) {
            return res.status(404).json({ success: false, message: 'Participant not found' });
        }

        // Update fields if provided
        if (firstName) participant.firstName = firstName;
        if (lastName) participant.lastName = lastName;
        if (phoneNumber) participant.phoneNumber = phoneNumber;
        if (collegeName && participant.participantType === 'Non-IIIT') {
            participant.collegeName = collegeName;
        }

        await participant.save();

        res.json({ 
            success: true, 
            message: 'Profile updated successfully', 
            data: participant 
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Preferences Management
exports.getPreferences = async (req, res) => {
    try {
        let preferences = await Preference.findOne({ participantId: req.user._id });
        
        if (!preferences) {
            preferences = {
                participantId: req.user._id,
                areasOfInterest: [],
                followedClubs: []
            };
        }

        res.json({ success: true, data: preferences });
    } catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updatePreferences = async (req, res) => {
    try {
        const { areasOfInterest } = req.body;

        let preferences = await Preference.findOne({ participantId: req.user._id });
        
        if (!preferences) {
            preferences = new Preference({ participantId: req.user._id });
        }

        if (areasOfInterest) {
            preferences.areasOfInterest = areasOfInterest;
        }

        await preferences.save();

        res.json({ 
            success: true, 
            message: 'Preferences updated successfully', 
            data: preferences 
        });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Club Following
exports.followClub = async (req, res) => {
    try {
        const { organizerId } = req.params;

        // Verify organizer exists
        const organizer = await Management.findOne({ 
            _id: organizerId, 
            role: 'organizer',
            isActive: true 
        });
        
        if (!organizer) {
            return res.status(404).json({ success: false, message: 'Club/Council not found' });
        }

        let preferences = await Preference.findOne({ participantId: req.user._id });
        
        if (!preferences) {
            preferences = new Preference({ 
                participantId: req.user._id,
                followedClubs: [organizerId]
            });
        } else {
            if (!preferences.followedClubs.includes(organizerId)) {
                preferences.followedClubs.push(organizerId);
            } else {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Already following this club' 
                });
            }
        }

        await preferences.save();

        res.json({ 
            success: true, 
            message: `Now following ${organizer.clubName || organizer.councilName}` 
        });
    } catch (error) {
        console.error('Error following club:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.unfollowClub = async (req, res) => {
    try {
        const { organizerId } = req.params;

        const preferences = await Preference.findOne({ participantId: req.user._id });
        
        if (!preferences) {
            return res.status(400).json({ 
                success: false, 
                message: 'Not following any clubs' 
            });
        }

        const index = preferences.followedClubs.indexOf(organizerId);
        if (index === -1) {
            return res.status(400).json({ 
                success: false, 
                message: 'Not following this club' 
            });
        }

        preferences.followedClubs.splice(index, 1);
        await preferences.save();

        res.json({ success: true, message: 'Unfollowed successfully' });
    } catch (error) {
        console.error('Error unfollowing club:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getFollowedClubs = async (req, res) => {
    try {
        const preferences = await Preference.findOne({ participantId: req.user._id })
            .populate('followedClubs', 'name clubName councilName organizerType email');

        const followedClubs = preferences?.followedClubs || [];

        res.json({ success: true, data: followedClubs });
    } catch (error) {
        console.error('Error fetching followed clubs:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Event Registration
exports.registerForEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { merchandiseItemId, quantity = 1 } = req.body;

        // Get event
        const event = await Event.findOne({ _id: eventId, status: { $in: ['published', 'ongoing'] } });
        if (!event) {
            // Also allow registration for ongoing events
            const ongoingEvent = await Event.findOne({ _id: eventId, status: 'ongoing' });
            if (!ongoingEvent) {
                return res.status(404).json({ success: false, message: 'Event not found or not accepting registrations' });
            }
            // Use ongoing event
            var eventToRegister = ongoingEvent;
        } else {
            var eventToRegister = event;
        }

        // Check registration deadline
        if (eventToRegister.registrationDeadline && new Date() > new Date(eventToRegister.registrationDeadline)) {
            return res.status(400).json({
                success: false,
                message: 'Registration deadline has passed for this event'
            });
        }

        // Check eligibility
        if (eventToRegister.eligibility && eventToRegister.eligibility !== 'all') {
            const participant = await Management.findById(req.user._id);
            if (eventToRegister.eligibility === 'iiit' && participant.participantType !== 'IIIT') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'This event is restricted to IIIT students only' 
                });
            }
            if (eventToRegister.eligibility === 'non-iiit' && participant.participantType !== 'Non-IIIT') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'This event is restricted to Non-IIIT participants only' 
                });
            }
        }

        // Check if already registered
        const existingRegistration = await Registration.findOne({
            participant: req.user._id,
            event: eventId,
            status: 'registered'
        });

        if (existingRegistration) {
            return res.status(400).json({ 
                success: false, 
                message: 'Already registered for this event' 
            });
        }

        // Check max participants
        if (eventToRegister.maxParticipants) {
            const currentCount = await Registration.countDocuments({
                event: eventId,
                status: 'registered'
            });
            
            if (currentCount >= eventToRegister.maxParticipants) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Event is full' 
                });
            }
        }

        // Handle merchandise events
        let merchandiseDetails = null;
        if (eventToRegister.eventType === 'merchandise') {
            if (!merchandiseItemId) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Please select a merchandise item' 
                });
            }

            const item = eventToRegister.merchandiseItems.id(merchandiseItemId);
            if (!item) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Merchandise item not found' 
                });
            }

            if (item.stock < quantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Not enough stock available' 
                });
            }

            // Stock will be decremented upon payment approval, not at registration time

            merchandiseDetails = {
                itemId: merchandiseItemId,
                itemName: item.name,
                size: item.size,
                quantity,
                price: item.price,
                totalAmount: item.price * quantity
            };
        }

        // Generate QR code
        const registrationData = {
            eventId,
            eventName: eventToRegister.name,
            participantId: req.user._id,
            participantEmail: req.user.email,
            registeredAt: new Date()
        };

        // For merchandise events with payment, QR is generated only after approval
        const isMerchandise = eventToRegister.eventType === 'merchandise';

        // Create registration first to get ticketId
        const registration = new Registration({
            participant: req.user._id,
            event: eventId,
            status: isMerchandise ? 'pending' : 'registered',
            merchandiseDetails,
            paymentStatus: isMerchandise ? 'pending_approval' : 'not_required',
            paymentAmount: merchandiseDetails ? merchandiseDetails.totalAmount : 0,
            registeredAt: new Date()
        });

        await registration.save(); // This triggers ticketId generation

        // Now generate QR with ticketId included
        registrationData.ticketId = registration.ticketId;
        const qrCode = isMerchandise ? null : await QRCode.toDataURL(JSON.stringify(registrationData));

        if (qrCode) {
            registration.qrCode = qrCode;
            await registration.save();
        }

        // Send confirmation email (non-blocking)
        const participantName = req.user.firstName 
            ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
            : req.user.name || req.user.email;
        
        sendEventRegistrationConfirmation({
            participantEmail: req.user.email,
            participantName,
            eventName: eventToRegister.eventName || eventToRegister.name,
            eventDate: eventToRegister.eventStartDate || eventToRegister.startDateTime,
            venue: eventToRegister.venue,
            qrCode,
        }).catch(err => console.error('Failed to send event registration email:', err.message));

        // Send Discord webhook notification (non-blocking)
        notifyNewRegistration({
            organizerId: eventToRegister.organizerId || eventToRegister.organizer,
            eventName: eventToRegister.eventName || eventToRegister.name,
            participantName,
            participantEmail: req.user.email,
            eventType: eventToRegister.eventType,
            merchandiseDetails,
        }).catch(err => console.error('Discord notification failed:', err.message));

        res.status(201).json({
            success: true,
            message: 'Successfully registered for event',
            data: {
                registration,
                qrCode
            }
        });
    } catch (error) {
        console.error('Error registering for event:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.cancelRegistration = async (req, res) => {
    try {
        const { eventId } = req.params;

        const registration = await Registration.findOne({
            participant: req.user._id,
            event: eventId,
            status: { $in: ['registered', 'pending'] }
        });

        if (!registration) {
            return res.status(404).json({ 
                success: false, 
                message: 'Registration not found' 
            });
        }

        // Restore merchandise stock only if payment was approved (stock was decremented at approval)
        if (registration.merchandiseDetails && registration.paymentStatus === 'approved') {
            const event = await Event.findById(eventId);
            if (event) {
                const details = Array.isArray(registration.merchandiseDetails) 
                    ? registration.merchandiseDetails 
                    : [registration.merchandiseDetails];
                for (const detail of details) {
                    const item = event.merchandiseItems.id(detail.itemId);
                    if (item) {
                        item.stock += (detail.quantity || 1);
                    }
                }
                await event.save();
            }
        }

        registration.status = 'cancelled';
        await registration.save();

        // Send cancellation email and Discord notification (non-blocking)
        const cancelEvent = await Event.findById(eventId);
        const participantName = req.user.firstName 
            ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
            : req.user.name || req.user.email;

        if (cancelEvent) {
            sendEventCancellationEmail({
                participantEmail: req.user.email,
                participantName,
                eventName: cancelEvent.eventName || cancelEvent.name,
            }).catch(err => console.error('Failed to send cancellation email:', err.message));

            notifyRegistrationCancelled({
                organizerId: cancelEvent.organizerId || cancelEvent.organizer,
                eventName: cancelEvent.eventName || cancelEvent.name,
                participantName,
                participantEmail: req.user.email,
            }).catch(err => console.error('Discord cancel notification failed:', err.message));
        }

        res.json({ success: true, message: 'Registration cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling registration:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getRegisteredEvents = async (req, res) => {
    try {
        const registrations = await Registration.find({
            participant: req.user._id
        })
            .populate('event')
            .sort({ registeredAt: -1 });

        res.json({ success: true, data: registrations });
    } catch (error) {
        console.error('Error fetching registered events:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Dashboard
exports.getDashboard = async (req, res) => {
    try {
        // Get registration counts
        const registrations = await Registration.find({
            participant: req.user._id,
            status: 'registered'
        }).populate('event');

        const now = new Date();
        const upcomingRegistrations = registrations.filter(
            r => r.event && new Date(r.event.startDateTime) > now
        );

        // Get followed clubs count
        const preferences = await Preference.findOne({ participantId: req.user._id });
        const followedClubsCount = preferences?.followedClubs?.length || 0;

        res.json({
            success: true,
            data: {
                registeredEventsCount: registrations.length,
                upcomingEventsCount: upcomingRegistrations.length,
                followedClubsCount,
                upcomingRegistrations: upcomingRegistrations.slice(0, 5)
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Password Management
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Current and new password are required' 
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'New password must be at least 6 characters' 
            });
        }

        const participant = await Management.findById(req.user._id);
        
        const isMatch = await bcrypt.compare(currentPassword, participant.password);
        if (!isMatch) {
            return res.status(400).json({ 
                success: false, 
                message: 'Current password is incorrect' 
            });
        }

        const salt = await bcrypt.genSalt(10);
        participant.password = await bcrypt.hash(newPassword, salt);
        await participant.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
