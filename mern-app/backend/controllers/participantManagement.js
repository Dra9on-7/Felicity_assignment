const Management = require('../models/Management');
const Preference = require('../models/Preference');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const bcrypt = require('bcryptjs');

exports.getProfile = async (req, res) => {
    try {
        const indivId = req.params.participantId;

        if (!indivId) {
            return res.status(400).json({ message: 'Participant ID is required' });
        }

        const participant = await Management.findById(indivId).select('-password');
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        const pref = await Preference.findOne({ participantId: indivId });

        return res.status(200).json({ participant, preferences: pref });
    } catch (error) {
        console.error('Error fetching profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const indivId = req.params.participantId;
        const { firstName, lastName, participantType, collegeOrOrgName, contactNumber } = req.body;
        
        if (!indivId) {
            return res.status(400).json({ message: 'Participant ID is required' });
        }

        const participant = await Management.findById(indivId);
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        participant.firstName = firstName || participant.firstName;
        participant.lastName = lastName || participant.lastName;
        participant.participantType = participantType || participant.participantType;
        participant.OrgName = collegeOrOrgName || participant.OrgName;
        participant.contactNumber = contactNumber || participant.contactNumber;

        await participant.save();

        return res.status(200).json({ message: 'Profile updated successfully', participant });
    } catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.updatePreferences = async (req, res) => {
    try {
        const indivId = req.params.participantId;
        const { areasOfInterest, followedClubs } = req.body;

        if (!indivId) {
            return res.status(400).json({ message: 'Participant ID is required' });
        }

        let pref = await Preference.findOne({ participantId: indivId });
        if (!pref) {
            pref = new Preference({ participantId: indivId });
        }

        pref.areasOfInterest = areasOfInterest || pref.areasOfInterest;
        pref.followedClubs = followedClubs || pref.followedClubs;

        await pref.save();

        return res.status(200).json({ message: 'Preferences updated successfully', preferences: pref });
    } catch (error) {
        console.error('Error updating preferences:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.getPreferences = async (req, res) => {
    try {
        const indivId = req.params.participantId;

        if (!indivId) {
            return res.status(400).json({ message: 'Participant ID is required' });
        }

        const pref = await Preference.findOne({ participantId: indivId });
        if (!pref) {
            return res.status(404).json({ message: 'Preferences not found' });
        }

        return res.status(200).json({ preferences: pref });
    } catch (error) {
        console.error('Error fetching preferences:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.getFollowedClubs = async (req, res) => {
    try {
        const indivId = req.params.participantId;

        if (!indivId) {
            return res.status(400).json({ message: 'Participant ID is required' });
        }

        const pref = await Preference.findOne({ participantId: indivId }).populate('followedClubs', 'firstName OrgName');
        if (!pref) {
            return res.status(404).json({ message: 'Preferences not found' });
        }

        return res.status(200).json({ followedClubs: pref.followedClubs });
    } catch (error) {
        console.error('Error fetching followed clubs:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.followClub = async (req, res) => {
    try {
        const indivId = req.params.participantId;
        const { clubId } = req.body;

        if (!indivId || !clubId) {
            return res.status(400).json({ message: 'Participant ID and Club ID are required' });
        }

        let pref = await Preference.findOne({ participantId: indivId });
        if (!pref) {
            pref = new Preference({ participantId: indivId, followedClubs: [clubId] });
        } else {
            if (pref.followedClubs.includes(clubId)) {
                return res.status(400).json({ message: 'Already following this club' });
            }
            pref.followedClubs.push(clubId);
        }

        await pref.save();

        return res.status(200).json({ message: 'Club followed successfully', preferences: pref });
    } catch (error) {
        console.error('Error following club:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.unfollowClub = async (req, res) => {
    try {
        const indivId = req.params.participantId;
        const { clubId } = req.body;

        if (!indivId || !clubId) {
            return res.status(400).json({ message: 'Participant ID and Club ID are required' });
        }

        let pref = await Preference.findOne({ participantId: indivId });
        if (!pref || !pref.followedClubs.includes(clubId)) {
            return res.status(404).json({ message: 'Club not found in followed list' });
        }

        pref.followedClubs = pref.followedClubs.filter(id => id.toString() !== clubId);
        await pref.save();

        return res.status(200).json({ message: 'Club unfollowed successfully', preferences: pref });
    } catch (error) {
        console.error('Error unfollowing club:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.getFollowedClubsEvents = async (req, res) => {
    try {
        const indivId = req.params.participantId;

        if (!indivId) {
            return res.status(400).json({ message: 'Participant ID is required' });
        }

        const pref = await Preference.findOne({ participantId: indivId }).populate('followedClubs', '_id');
        if (!pref) {
            return res.status(404).json({ message: 'Preferences not found' });
        }

        const followedClubIds = pref.followedClubs.map(club => club._id);
        const events = await Event.find({ organizerId: { $in: followedClubIds } });

        return res.status(200).json({ events });
    } catch (error) {
        console.error('Error fetching followed clubs events:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.getRegisteredEvents = async (req, res) => {
    try {
        const indivId = req.params.participantId;

        if (!indivId) {
            return res.status(400).json({ message: 'Participant ID is required' });
        }

        const registrations = await Registration.find({ participantId: indivId }).populate('eventId');
        const events = registrations.map(reg => reg.eventId);

        return res.status(200).json({ events });
    } catch (error) {
        console.error('Error fetching registered events:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.getEventRegistrationStatus = async (req, res) => {
    try {
        const indivId = req.params.participantId;
        const eventId = req.params.eventId;

        if (!indivId || !eventId) {
            return res.status(400).json({ message: 'Participant ID and Event ID are required' });
        }

        const registration = await Registration.findOne({ participantId: indivId, eventId });
        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        return res.status(200).json({ status: registration.status });
    } catch (error) {
        console.error('Error fetching event registration status:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.cancelRegistration = async (req, res) => {
    try {
        const indivId = req.params.participantId;
        const eventId = req.params.eventId;

        if (!indivId || !eventId) {
            return res.status(400).json({ message: 'Participant ID and Event ID are required' });
        }

        const registration = await Registration.findOne({ participantId: indivId, eventId });
        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        registration.status = 'cancelled';
        await registration.save();

        return res.status(200).json({ message: 'Registration cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling registration:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.markAttendance = async (req, res) => {
    try {
        const indivId = req.params.participantId;
        const eventId = req.params.eventId;
        
        if (!indivId || !eventId) {
            return res.status(400).json({ message: 'Participant ID and Event ID are required' });
        }

        const registration = await Registration.findOne({ participantId: indivId, eventId });
        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        registration.status = 'attended';
        await registration.save();

        return res.status(200).json({ message: 'Attendance marked successfully' });
    } catch (error) {
        console.error('Error marking attendance:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.getParticipationHistory = async (req, res) => {
    try {
        const indivId = req.params.participantId;

        if (!indivId) {
            return res.status(400).json({ message: 'Participant ID is required' });
        }

        const registrations = await Registration.find({ participantId: indivId, status: 'attended' }).populate('eventId');
        const events = registrations.map(reg => reg.eventId);

        return res.status(200).json({ events });
    } catch (error) {
        console.error('Error fetching participation history:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.getupcomingEvents = async (req, res) => {
    try {
        const indivId = req.params.participantId;

        if (!indivId) {
            return res.status(400).json({ message: 'Participant ID is required' });
        }

        const registrations = await Registration.find({ participantId: indivId, status: 'registered' }).populate('eventId');
        const events = registrations.map(reg => reg.eventId).filter(event => new Date(event.eventStartDate) > new Date());

        return res.status(200).json({ events });
    } catch (error) {
        console.error('Error fetching upcoming events:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Search and filter events
exports.searchEvents = async (req, res) => {
    try {
        const { query, eventType, eligibility, startDate, endDate, followedClubs } = req.query;
        let filter = {};
        if (query) {
            filter.$or = [
                { eventName: { $regex: query, $options: 'i' } },
                { eventDescription: { $regex: query, $options: 'i' } },
            ];
        }
        if (eventType) filter.eventType = eventType;
        if (eligibility) filter.eligibility = eligibility;
        if (startDate || endDate) {
            filter.eventStartDate = {};
            if (startDate) filter.eventStartDate.$gte = new Date(startDate);
            if (endDate) filter.eventStartDate.$lte = new Date(endDate);
        }
        if (followedClubs) {
            filter.organizerId = { $in: followedClubs.split(',') };
        }
        const events = await Event.find(filter).populate('organizerId', 'organizerName category');
        return res.status(200).json({ events });
    } catch (error) {
        console.error('Error searching events:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Get trending events (Top 5 in last 24h)
exports.getTrendingEvents = async (req, res) => {
    try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const registrations = await Registration.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: '$eventId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        const eventIds = registrations.map(r => r._id);
        const events = await Event.find({ _id: { $in: eventIds } }).populate('organizerId', 'organizerName category');
        return res.status(200).json({ events });
    } catch (error) {
        console.error('Error fetching trending events:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// List all approved organizers (Name, Category, Description)
exports.listOrganizers = async (req, res) => {
    try {
        const organizers = await Management.find({ role: 'organizer' }, 'organizerName category description contactEmail');
        return res.status(200).json({ organizers });
    } catch (error) {
        console.error('Error listing organizers:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Organizer detail page (participant view): Info + upcoming/past events
exports.getOrganizerDetail = async (req, res) => {
    try {
        const organizerId = req.params.organizerId;
        if (!organizerId) {
            return res.status(400).json({ message: 'Organizer ID is required' });
        }
        const organizer = await Management.findById(organizerId).select('organizerName category description contactEmail');
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }
        const now = new Date();
        const upcomingEvents = await Event.find({ organizerId, eventStartDate: { $gte: now } });
        const pastEvents = await Event.find({ organizerId, eventEndDate: { $lt: now } });
        return res.status(200).json({ organizer, upcomingEvents, pastEvents });
    } catch (error) {
        console.error('Error fetching organizer detail:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Change participant password (with old password verification)
exports.changePassword = async (req, res) => {
    try {
        const indivId = req.params.participantId;
        const { oldPassword, newPassword } = req.body;
        if (!indivId || !oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Participant ID, old password, and new password are required' });
        }
        const participant = await Management.findById(indivId);
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }
        const isMatch = await bcrypt.compare(oldPassword, participant.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Old password is incorrect' });
        }
        const salt = await bcrypt.genSalt(10);
        participant.password = await bcrypt.hash(newPassword, salt);
        await participant.save();
        return res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Request password reset (sends a reset token to email - stub, to be implemented with email logic)
exports.requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        const participant = await Management.findOne({ email, role: 'participant' });
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }
        // Generate a reset token (for demo, use a random string)
        const resetToken = Math.random().toString(36).substring(2, 15);
        // Here, you would save the token and send an email (not implemented)
        // participant.resetToken = resetToken; await participant.save();
        // sendResetEmail(email, resetToken); // <-- implement this
        return res.status(200).json({ message: 'Password reset requested. (Email logic to be implemented)', resetToken });
    } catch (error) {
        console.error('Error requesting password reset:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Reset password using token (stub, to be implemented with token logic)
exports.resetPassword = async (req, res) => {
    try {
        const { email, resetToken, newPassword } = req.body;
        if (!email || !resetToken || !newPassword) {
            return res.status(400).json({ message: 'Email, reset token, and new password are required' });
        }
        // Find participant and verify token (token logic to be implemented)
        // const participant = await Management.findOne({ email, resetToken, role: 'participant' });
        // if (!participant) {
        //     return res.status(400).json({ message: 'Invalid token or email' });
        // }
        // For demo, assume token is valid
        const participant = await Management.findOne({ email, role: 'participant' });
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }
        const salt = await bcrypt.genSalt(10);
        participant.password = await bcrypt.hash(newPassword, salt);
        // participant.resetToken = undefined; // Clear token after use
        await participant.save();
        return res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

