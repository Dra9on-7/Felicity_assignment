const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Management = require('../models/Management.js');

// Helper: Check if email is IIIT
function checkMail(email) {
    if (email.endsWith('@iiit.ac.in')) {
        return 0;
    } else {
        return 1;
    }
}

// Participant Registration
exports.registerParticipant = async (req, res) => {
    try {
        const { firstName, lastName, email, password, participantType } = req.body;

        // IIIT email validation
        if (participantType === 'IIIT' && checkMail(email) === 1) {
            return res.status(400).json({ message: 'IIIT participants must use IIIT email.' });
        }
        else if (participantType === 'Non-IIIT' && checkMail(email) === 0) {
            return res.status(400).json({ message: 'Non-IIIT participants cannot use IIIT email.' });
        }

        // Check if user exists
        const existing = await Management.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create participant
        const user = new Management({
            role: 'participant',
            email,
            password: hashedPassword,
            firstName,
            lastName,
            participantType
        });
        await user.save();

        res.status(201).json({ message: 'Registration successful.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
};

// Login (for all roles)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Management.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                participantType: user.participantType
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
};

