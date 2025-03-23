const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiter');
const { register, login, refreshTokens, verifyEmail } = require('../controllers/authController');

// Apply rate limiting to auth endpoints
router.use('/register', authLimiter);
router.use('/login', authLimiter);
router.use('/refresh', authLimiter);

// Auth endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshTokens);
router.get('/verify/:userId/:token', verifyEmail);

module.exports = router;
