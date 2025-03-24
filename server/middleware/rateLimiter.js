const rateLimit = require('express-rate-limit');
const { securityAlertService } = require('../services/securityAlertService');
const { Op } = require('sequelize');
const User = require('../models/User');

// Global rate limiter
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: async (req) => {
    // Skip rate limiting for whitelisted IPs
    const whitelist = process.env.IP_WHITELIST?.split(',') || [];
    return whitelist.includes(req.ip);
  },
  handler: async (req, res, next) => {
    try {
      // Log rate limit violation
      await securityAlertService.createAlert({
        title: 'Rate Limit Violation',
        description: `IP ${req.ip} exceeded rate limit`,
        severity: 'WARNING',
        type: 'RATE_LIMIT_VIOLATION',
        metadata: {
          ip: req.ip,
          endpoint: req.path,
          method: req.method
        }
      });

      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: process.env.RATE_LIMIT_WINDOW_MS / 1000
      });
    } catch (error) {
      next(error);
    }
  }
});

// Authentication rate limiter
const authLimiter = rateLimit({
  windowMs: process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.AUTH_RATE_LIMIT_MAX || 5, // 5 login attempts per window
  message: {
    error: 'Too many login attempts from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: async (req) => {
    // Skip rate limiting for whitelisted IPs
    const whitelist = process.env.IP_WHITELIST?.split(',') || [];
    return whitelist.includes(req.ip);
  },
  handler: async (req, res, next) => {
    try {
      // Log authentication rate limit violation
      await securityAlertService.createAlert({
        title: 'Authentication Rate Limit Violation',
        description: `IP ${req.ip} exceeded authentication rate limit`,
        severity: 'WARNING',
        type: 'AUTH_RATE_LIMIT_VIOLATION',
        metadata: {
          ip: req.ip,
          endpoint: req.path,
          method: req.method
        }
      });

      // Check if this IP has too many failed attempts
      const failedAttempts = await User.count({
        where: {
          lastFailedLogin: {
            [Op.gt]: new Date(Date.now() - (process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000))
          },
          '$failedLoginIPs.ip$': req.ip
        },
        include: [
          {
            model: User,
            as: 'failedLoginIPs',
            where: { ip: req.ip }
          }
        ]
      });

      if (failedAttempts >= (process.env.MAX_FAILED_ATTEMPTS_PER_IP || 10)) {
        // Block IP if too many failed attempts
        await securityAlertService.createAlert({
          title: 'IP Blocked for Excessive Failed Attempts',
          description: `IP ${req.ip} blocked due to excessive failed attempts`,
          severity: 'ERROR',
          type: 'IP_BLOCKED',
          metadata: {
            ip: req.ip,
            failedAttempts,
            reason: 'Excessive failed login attempts'
          }
        });

        res.status(403).json({
          error: 'Your IP has been temporarily blocked due to excessive failed login attempts. Please try again later.'
        });
        return;
      }

      res.status(429).json({
        error: 'Too many login attempts from this IP, please try again later.',
        retryAfter: process.env.AUTH_RATE_LIMIT_WINDOW_MS / 1000
      });
    } catch (error) {
      next(error);
    }
  }
});

// API key rate limiter
const apiKeyLimiter = rateLimit({
  windowMs: process.env.API_KEY_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000, // 1 hour
  max: process.env.API_KEY_RATE_LIMIT_MAX || 1000, // 1000 requests per hour
  message: {
    error: 'API key rate limit exceeded. Please upgrade your plan or try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use API key if provided, otherwise use IP
    return req.headers['x-api-key'] || req.ip;
  },
  skip: async (req) => {
    // Skip rate limiting for whitelisted IPs
    const whitelist = process.env.IP_WHITELIST?.split(',') || [];
    return whitelist.includes(req.ip);
  },
  handler: async (req, res, next) => {
    try {
      // Log API key rate limit violation
      await securityAlertService.createAlert({
        title: 'API Key Rate Limit Violation',
        description: `API key ${req.headers['x-api-key']} exceeded rate limit`,
        severity: 'WARNING',
        type: 'API_KEY_RATE_LIMIT_VIOLATION',
        metadata: {
          apiKey: req.headers['x-api-key'],
          ip: req.ip,
          endpoint: req.path,
          method: req.method
        }
      });

      res.status(429).json({
        error: 'API key rate limit exceeded. Please upgrade your plan or try again later.',
        retryAfter: process.env.API_KEY_RATE_LIMIT_WINDOW_MS / 1000
      });
    } catch (error) {
      next(error);
    }
  }
});

// IP-based rate limiter
const ipLimiter = rateLimit({
  windowMs: process.env.IP_RATE_LIMIT_WINDOW_MS || 24 * 60 * 60 * 1000, // 24 hours
  max: process.env.IP_RATE_LIMIT_MAX || 10000, // 10000 requests per day
  message: {
    error: 'IP rate limit exceeded. Please contact support.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  skip: async (req) => {
    // Skip rate limiting for whitelisted IPs
    const whitelist = process.env.IP_WHITELIST?.split(',') || [];
    return whitelist.includes(req.ip);
  },
  handler: async (req, res, next) => {
    try {
      // Log IP rate limit violation
      await securityAlertService.createAlert({
        title: 'IP Rate Limit Violation',
        description: `IP ${req.ip} exceeded daily rate limit`,
        severity: 'WARNING',
        type: 'IP_RATE_LIMIT_VIOLATION',
        metadata: {
          ip: req.ip,
          endpoint: req.path,
          method: req.method
        }
      });

      res.status(429).json({
        error: 'IP rate limit exceeded. Please contact support.',
        retryAfter: process.env.IP_RATE_LIMIT_WINDOW_MS / 1000
      });
    } catch (error) {
      next(error);
    }
  }
});

module.exports = { 
  limiter, 
  authLimiter,
  apiKeyLimiter,
  ipLimiter 
};
