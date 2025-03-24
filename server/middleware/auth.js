const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { rateLimiter } = require('./rateLimiter');
const { validationResult } = require('express-validator');
const { validatePassword } = require('../utils/passwordValidator');
const { validate } = require('../utils/validators');
const { securityAlertService } = require('../services/securityAlertService');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SESSION_TIMEOUT = process.env.SESSION_TIMEOUT || 3600; // 1 hour
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error('Authentication required');
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.role = decoded.role;
    req.deviceId = decoded.deviceId;

    // Verify if user still exists and is not deleted
    const user = await User.findByPk(req.userId);
    if (!user || user.deletedAt) {
      throw new Error('User not found or account deleted');
    }

    // Check if token is blacklisted
    if (user.sessionTokens?.includes(token)) {
      throw new Error('Token revoked');
    }

    // Check session timeout
    const tokenAge = (Date.now() - decoded.iat * 1000) / 1000;
    if (tokenAge > SESSION_TIMEOUT) {
      throw new Error('Session expired');
    }

    // Check if account is locked
    if (await user.isLocked()) {
      throw new Error('Account locked');
    }

    // Check if MFA is required
    if (user.mfaEnabled && !req.headers['x-mfa-token']) {
      throw new Error('MFA required');
    }

    // Verify MFA token if provided
    if (req.headers['x-mfa-token']) {
      const isValid = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: req.headers['x-mfa-token']
      });

      if (!isValid) {
        throw new Error('Invalid MFA token');
      }
    }

    // Update last active time
    await user.update({ lastLogin: new Date() });

    next();
  } catch (error) {
    await securityAlertService.createAlert({
      title: 'Authentication Failure',
      description: `Authentication failed: ${error.message}`,
      severity: 'WARNING',
      type: 'AUTHENTICATION_FAILURE',
      userId: req.userId,
      ipAddress: req.ip,
      metadata: {
        error: error.message,
        tokenProvided: !!req.header('Authorization')
      }
    });

    res.status(401).json({ 
      error: error.message || 'Please authenticate' 
    });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, async () => {
      if (!['admin', 'superadmin'].includes(req.role)) {
        throw new Error('Admin access required');
      }
      next();
    });
  } catch (error) {
    await securityAlertService.createAlert({
      title: 'Unauthorized Access Attempt',
      description: `Unauthorized access attempt to admin resource`,
      severity: 'ERROR',
      type: 'UNAUTHORIZED_ACCESS',
      userId: req.userId,
      ipAddress: req.ip,
      metadata: {
        requestedRole: req.role,
        requiredRole: 'admin'
      }
    });

    res.status(403).json({ 
      error: error.message || 'Access denied' 
    });
  }
};

const validateUserPassword = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (await user.isLocked()) {
      throw new Error('Account locked');
    }

    // Verify password
    const isValid = await user.validatePassword(password);
    if (!isValid) {
      // Track failed login attempt
      await user.trackLoginAttempt(false, req);
      throw new Error('Invalid credentials');
    }

    // Track successful login
    await user.trackLoginAttempt(true, req);

    // Generate tokens
    const tokens = await generateTokens(user, req);
    req.tokens = tokens;

    next();
  } catch (error) {
    await securityAlertService.createAlert({
      title: 'Login Attempt Failed',
      description: `Login attempt failed: ${error.message}`,
      severity: 'WARNING',
      type: 'LOGIN_ATTEMPT_FAILED',
      userId: req.userId,
      ipAddress: req.ip,
      metadata: {
        email: req.body.email,
        error: error.message
      }
    });

    res.status(401).json({ 
      error: error.message || 'Invalid credentials' 
    });
  }
};

const generateTokens = async (user, req) => {
  // Generate access token
  const accessToken = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      deviceId: req.deviceId,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // Generate refresh token
  const refreshToken = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      deviceId: req.deviceId
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  // Store refresh token
  await user.update({
    sessionTokens: [...(user.sessionTokens || []), refreshToken]
  });

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: JWT_EXPIRES_IN
  };
};

const validateToken = async (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user || user.deletedAt) {
      return false;
    }

    // Check if token is blacklisted
    if (user.sessionTokens?.includes(token)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

const logout = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const user = await User.findByPk(req.userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Blacklist token
    await user.update({
      sessionTokens: [...(user.sessionTokens || []), token]
    });

    res.json({ message: 'Successfully logged out' });
  } catch (error) {
    await securityAlertService.createAlert({
      title: 'Logout Failed',
      description: `Logout failed: ${error.message}`,
      severity: 'WARNING',
      type: 'LOGOUT_FAILED',
      userId: req.userId,
      ipAddress: req.ip,
      metadata: {
        error: error.message
      }
    });

    res.status(400).json({ error: error.message });
  }
};

const enableMFA = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate MFA secret
    const secret = speakeasy.generateSecret({ length: 20 });
    
    // Store secret
    await user.update({
      mfaSecret: secret.base32,
      mfaEnabled: true
    });

    // Generate QR code
    const qrCode = await qrcode.toDataURL(
      speakeasy.otpauthURL({
        secret: secret.base32,
        label: `${user.email}@religious-community-hub`,
        issuer: 'Religious Community Hub'
      })
    );

    res.json({
      secret: secret.base32,
      qrCode,
      verificationCode: speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      })
    });
  } catch (error) {
    await securityAlertService.createAlert({
      title: 'MFA Enable Failed',
      description: `MFA enable failed: ${error.message}`,
      severity: 'WARNING',
      type: 'MFA_ENABLE_FAILED',
      userId: req.userId,
      ipAddress: req.ip,
      metadata: {
        error: error.message
      }
    });

    res.status(400).json({ error: error.message });
  }
};

const disableMFA = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify MFA token
    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: req.body.token
    });

    if (!isValid) {
      throw new Error('Invalid MFA token');
    }

    // Disable MFA
    await user.update({
      mfaSecret: null,
      mfaEnabled: false
    });

    res.json({ message: 'MFA disabled successfully' });
  } catch (error) {
    await securityAlertService.createAlert({
      title: 'MFA Disable Failed',
      description: `MFA disable failed: ${error.message}`,
      severity: 'WARNING',
      type: 'MFA_DISABLE_FAILED',
      userId: req.userId,
      ipAddress: req.ip,
      metadata: {
        error: error.message
      }
    });

    res.status(400).json({ error: error.message });
  }
};

module.exports = { 
  auth, 
  adminAuth,
  validateUserPassword,
  generateTokens,
  validateToken,
  logout,
  enableMFA,
  disableMFA,
  rateLimiter
};
