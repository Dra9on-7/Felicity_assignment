const jwt = require('jsonwebtoken');
const Management = require('../models/Management');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No authentication token, access denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await Management.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};

/**
 * Role-based Access Control Middleware
 * @param {string[]} roles - Array of allowed roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access denied. Role '${req.user.role}' is not authorized to access this resource` 
            });
        }
        
        next();
    };
};

/**
 * Participant only middleware
 */
const participantOnly = authorize('participant');

/**
 * Organizer only middleware
 */
const organizerOnly = authorize('organizer');

/**
 * Admin only middleware
 */
const adminOnly = authorize('admin');

/**
 * Organizer or Admin middleware
 */
const organizerOrAdmin = authorize('organizer', 'admin');

/**
 * Optional Auth Middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await Management.findById(decoded.id).select('-password');
            if (user) {
                req.user = user;
                req.token = token;
            }
        }
        next();
    } catch (error) {
        // Token invalid, but that's okay for optional auth
        next();
    }
};

module.exports = {
    auth,
    authorize,
    participantOnly,
    organizerOnly,
    adminOnly,
    organizerOrAdmin,
    optionalAuth
};
