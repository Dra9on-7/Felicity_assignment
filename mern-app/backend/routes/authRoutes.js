const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const authController = require('../controllers/authController');
const { generateCaptcha, verifyCaptcha } = require('../utils/captcha');

/**
 * Authentication Routes
 * GET  /api/auth/captcha - Get a new CAPTCHA challenge
 * POST /api/auth/register - Register new participant
 * POST /api/auth/login - Login (all roles)
 * GET  /api/auth/me - Get current user
 * POST /api/auth/logout - Logout
 */

// Get a new CAPTCHA challenge
router.get('/captcha', (req, res) => {
  const captcha = generateCaptcha();
  res.json({ success: true, data: captcha });
});

// Register new participant
router.post('/register', authController.register);

// Login (for all roles)
router.post('/login', authController.login);

// Get current authenticated user
router.get('/me', auth, authController.getMe);

// Logout
router.post('/logout', auth, authController.logout);

module.exports = router;
