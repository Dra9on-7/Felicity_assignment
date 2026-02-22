const bcrypt = require('bcryptjs');
const Management = require('../models/Management');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { sendOrganizerCreatedEmail } = require('../utils/emailService');

/**
 * Admin Controller
 * Handles admin-only operations for the Felicity Event Management System
 */

// Get admin dashboard stats
exports.getDashboardStats = async (req, res) => {
    try {
        const totalParticipants = await Management.countDocuments({ role: 'participant' });
        const totalOrganizers = await Management.countDocuments({ role: 'organizer' });
        const totalEvents = await Event.countDocuments();
        const totalRegistrations = await Registration.countDocuments();
        const publishedEvents = await Event.countDocuments({ status: { $in: ['published', 'ongoing'] } });
        const draftEvents = await Event.countDocuments({ status: 'draft' });

        // Get pending password reset requests
        const pendingPasswordResets = await Management.countDocuments({ 
            role: 'organizer', 
            passwordResetRequested: true 
        });

        return res.status(200).json({
            stats: {
                totalParticipants,
                totalOrganizers,
                totalEvents,
                totalRegistrations,
                publishedEvents,
                draftEvents,
                pendingPasswordResets
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Create new organizer account (Admin only)
exports.createOrganizer = async (req, res) => {
    try {
        const { email, password, clubName, councilName, category, contactEmail, description, organizerName } = req.body;

        // The login email can be provided as 'email' or 'contactEmail'
        const loginEmail = (email || contactEmail || '').toLowerCase().trim();
        // The organizer display name can be clubName, organizerName, or councilName
        const displayName = organizerName || clubName || councilName || '';

        if (!loginEmail || !password) {
            return res.status(400).json({ 
                message: 'Email and password are required' 
            });
        }

        if (!displayName) {
            return res.status(400).json({ 
                message: 'Organizer name or club name is required' 
            });
        }

        // Check if email already exists
        const existing = await Management.findOne({ email: loginEmail });
        if (existing) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const organizer = new Management({
            role: 'organizer',
            email: loginEmail,
            password: hashedPassword,
            organizerName: displayName,
            clubName: clubName || displayName,
            councilName: councilName || '',
            category: category || '',
            description: description || '',
            contactEmail: contactEmail || loginEmail,
            isActive: true,
            status: 'active'
        });

        await organizer.save();

        // Send email notification to the new organizer (non-blocking)
        sendOrganizerCreatedEmail({
            email: loginEmail,
            organizerName: displayName,
            password, // Send plaintext password in email so they can log in
        }).catch(err => console.error('Failed to send organizer creation email:', err.message));

        return res.status(201).json({ 
            message: 'Organizer created successfully',
            data: {
                id: organizer._id,
                organizerName: organizer.organizerName,
                clubName: organizer.clubName,
                category: organizer.category,
                email: organizer.email,
                contactEmail: organizer.contactEmail
            }
        });
    } catch (error) {
        console.error('Error creating organizer:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Get all organizers
exports.getAllOrganizers = async (req, res) => {
    try {
        const organizers = await Management.find({ role: 'organizer' })
            .select('-password')
            .sort({ createdAt: -1 });

        return res.status(200).json({ data: organizers });
    } catch (error) {
        console.error('Error fetching organizers:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Update organizer
exports.updateOrganizer = async (req, res) => {
    try {
        const { organizerId } = req.params;
        const { organizerName, category, description, contactEmail } = req.body;

        const organizer = await Management.findById(organizerId);
        if (!organizer || organizer.role !== 'organizer') {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        organizer.organizerName = organizerName || organizer.organizerName;
        organizer.category = category || organizer.category;
        organizer.description = description || organizer.description;
        organizer.contactEmail = contactEmail || organizer.contactEmail;

        await organizer.save();

        return res.status(200).json({ 
            message: 'Organizer updated successfully',
            organizer: {
                id: organizer._id,
                organizerName: organizer.organizerName,
                category: organizer.category,
                contactEmail: organizer.contactEmail
            }
        });
    } catch (error) {
        console.error('Error updating organizer:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Disable/Enable organizer account
exports.toggleOrganizerStatus = async (req, res) => {
    try {
        const { organizerId } = req.params;
        const { isActive } = req.body;

        const organizer = await Management.findById(organizerId);
        if (!organizer || organizer.role !== 'organizer') {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        organizer.isActive = isActive !== undefined ? isActive : !organizer.isActive;
        organizer.status = organizer.isActive ? 'active' : 'disabled';
        await organizer.save();

        return res.status(200).json({ 
            message: `Organizer ${organizer.isActive ? 'enabled' : 'disabled'} successfully`,
            organizer: {
                id: organizer._id,
                organizerName: organizer.organizerName,
                isActive: organizer.isActive,
                status: organizer.status
            }
        });
    } catch (error) {
        console.error('Error toggling organizer status:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Update organizer status directly
exports.updateOrganizerStatus = async (req, res) => {
    try {
        const { organizerId } = req.params;
        const { status } = req.body;

        const organizer = await Management.findById(organizerId);
        if (!organizer || organizer.role !== 'organizer') {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        organizer.status = status;
        organizer.isActive = status === 'active';
        await organizer.save();

        return res.status(200).json({ 
            message: `Organizer status updated to ${status}`,
            data: organizer
        });
    } catch (error) {
        console.error('Error updating organizer status:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Delete organizer account (cascades: deletes all events and registrations)
exports.deleteOrganizer = async (req, res) => {
    try {
        const { organizerId } = req.params;

        const organizer = await Management.findById(organizerId);
        if (!organizer || organizer.role !== 'organizer') {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        // Cascade delete: find all events by this organizer
        const events = await Event.find({ $or: [{ organizerId }, { organizer: organizerId }] });
        const eventIds = events.map(e => e._id);

        // Delete all registrations for those events
        if (eventIds.length > 0) {
            const deletedRegs = await Registration.deleteMany({ $or: [{ event: { $in: eventIds } }, { eventId: { $in: eventIds } }] });
            console.log(`Cascade: deleted ${deletedRegs.deletedCount} registrations for organizer ${organizerId}`);
        }

        // Delete all events
        const deletedEvents = await Event.deleteMany({ $or: [{ organizerId }, { organizer: organizerId }] });
        console.log(`Cascade: deleted ${deletedEvents.deletedCount} events for organizer ${organizerId}`);

        // Delete the organizer
        await Management.findByIdAndDelete(organizerId);

        return res.status(200).json({ 
            message: 'Organizer and all associated data deleted successfully',
            deletedEvents: deletedEvents.deletedCount,
            deletedRegistrations: eventIds.length > 0 ? 'cleaned' : 0
        });
    } catch (error) {
        console.error('Error deleting organizer:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Get password reset requests
exports.getPasswordResetRequests = async (req, res) => {
    try {
        const requests = await Management.find({ 
            role: 'organizer', 
            passwordResetRequested: true 
        }).select('organizerName clubName councilName email contactEmail createdAt passwordResetRequestedAt');

        return res.status(200).json({ requests });
    } catch (error) {
        console.error('Error fetching password reset requests:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Reset organizer password (Admin handles the request)
exports.resetOrganizerPassword = async (req, res) => {
    try {
        const { organizerId } = req.params;
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ message: 'New password is required' });
        }

        const organizer = await Management.findById(organizerId);
        if (!organizer || organizer.role !== 'organizer') {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        const salt = await bcrypt.genSalt(10);
        organizer.password = await bcrypt.hash(newPassword, salt);
        organizer.passwordResetRequested = false;
        organizer.passwordResetRequestedAt = undefined;

        await organizer.save();

        return res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Get all participants
exports.getAllParticipants = async (req, res) => {
    try {
        const participants = await Management.find({ role: 'participant' })
            .select('-password')
            .sort({ createdAt: -1 });

        return res.status(200).json({ participants });
    } catch (error) {
        console.error('Error fetching participants:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Get all events (admin view)
exports.getAllEvents = async (req, res) => {
    try {
        const events = await Event.find()
            .populate('organizerId', 'organizerName category')
            .sort({ createdAt: -1 });

        return res.status(200).json({ events });
    } catch (error) {
        console.error('Error fetching events:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Initialize Admin Account (backend only - no UI)
exports.initializeAdmin = async (req, res) => {
    try {
        // Check if admin already exists
        const existingAdmin = await Management.findOne({ role: 'admin' });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin account already exists' });
        }

        const { email, password, adminName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const admin = new Management({
            role: 'admin',
            email: email.toLowerCase(),
            password: hashedPassword,
            adminName: adminName || 'System Admin',
            privileges: 'full'
        });

        await admin.save();

        return res.status(201).json({ message: 'Admin account created successfully' });
    } catch (error) {
        console.error('Error initializing admin:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};
