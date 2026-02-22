const Management = require('../models/Management');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendRegistrationConfirmation } = require('../utils/emailService');
const { verifyCaptcha } = require('../utils/captcha');

/**
 * Auth Controller
 * Handles authentication operations
 */

// Register new participant
exports.register = async (req, res) => {
    try {
        const { 
            email, 
            password, 
            firstName, 
            lastName, 
            phoneNumber, 
            collegeName,
            participantType,
            captchaId,
            captchaAnswer
        } = req.body;

        // CAPTCHA verification
        if (!captchaId || captchaAnswer === undefined || captchaAnswer === null || captchaAnswer === '') {
            return res.status(400).json({
                success: false,
                message: 'Please complete the CAPTCHA'
            });
        }
        if (!verifyCaptcha(captchaId, captchaAnswer)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid CAPTCHA answer. Please try again.'
            });
        }

        // Validation
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide all required fields' 
            });
        }

        // Check if user exists
        const existingUser = await Management.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email already registered' 
            });
        }

        // Determine participant type from email (includes faculty/research/staff domains)
        const isIIIT = email.endsWith('@iiit.ac.in') || 
                       email.endsWith('@students.iiit.ac.in') || 
                       email.endsWith('@faculty.iiit.ac.in') || 
                       email.endsWith('@research.iiit.ac.in');
        const finalParticipantType = participantType || (isIIIT ? 'IIIT' : 'Non-IIIT');

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = new Management({
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'participant',
            firstName,
            lastName,
            name: `${firstName} ${lastName}`,
            phoneNumber,
            collegeName: finalParticipantType === 'Non-IIIT' ? collegeName : 'IIIT Hyderabad',
            participantType: finalParticipantType
        });

        await user.save();

        // Send registration confirmation email (non-blocking)
        sendRegistrationConfirmation({ email: user.email, firstName, lastName }).catch(err => {
            console.error('Failed to send registration email:', err.message);
        });

        // Generate token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: userResponse
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, password, captchaId, captchaAnswer } = req.body;

        // CAPTCHA verification
        if (!captchaId || captchaAnswer === undefined || captchaAnswer === null || captchaAnswer === '') {
            return res.status(400).json({
                success: false,
                message: 'Please complete the CAPTCHA'
            });
        }
        if (!verifyCaptcha(captchaId, captchaAnswer)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid CAPTCHA answer. Please try again.'
            });
        }

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide email and password' 
            });
        }

        // Find user
        const user = await Management.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Check if organizer is active
        if (user.role === 'organizer' && !user.isActive) {
            return res.status(403).json({ 
                success: false, 
                message: 'Your account has been disabled. Please contact admin.' 
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: userResponse
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get current user
exports.getMe = async (req, res) => {
    try {
        const user = await Management.findById(req.user._id).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Logout (client-side token removal, but we can blacklist if needed)
exports.logout = async (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
};
