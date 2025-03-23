const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { rateLimiter } = require('./rateLimiter');
require('dotenv').config();

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error('Authentication required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.role = decoded.role;

    // Verify if user still exists and is not deleted
    const user = await User.findByPk(req.userId);
    if (!user || user.deletedAt) {
      throw new Error('User not found or account deleted');
    }

    next();
  } catch (error) {
    res.status(401).json({ 
      error: error.message || 'Please authenticate' 
    });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, async () => {
      if (req.role !== 'admin') {
        throw new Error('Admin access required');
      }
      next();
    });
  } catch (error) {
    res.status(403).json({ 
      error: error.message || 'Access denied' 
    });
  }
};

const generateTokens = async (user) => {
  try {
    // Generate access token
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        algorithm: 'HS256'
      }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      { 
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
        algorithm: 'HS256'
      }
    );

    return { accessToken, refreshToken };
  } catch (error) {
    throw new Error('Failed to generate tokens');
  }
};

const validateToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    if (!user || user.deletedAt) {
      return null;
    }
    return user;
  } catch (error) {
    return null;
  }
};

module.exports = { 
  auth, 
  adminAuth,
  generateTokens,
  validateToken,
  rateLimiter
};
