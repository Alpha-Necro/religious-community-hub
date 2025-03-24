const express = require('express');
const router = express.Router();

// Authentication routes
router.use('/auth', require('./auth'));

// User management routes
router.use('/users', require('./users'));

// Session management routes
router.use('/sessions', require('./sessions'));

// IP control routes
router.use('/ip-control', require('./ip-control'));

// Security routes
router.use('/security', require('./security'));

module.exports = router;
