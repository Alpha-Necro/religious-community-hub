const { securityAlertService } = require('../services/securityAlertService');
const { ApiError } = require('../middleware/errorHandler');

const securityAlertMiddleware = {
  // Middleware to track failed login attempts
  trackFailedLogin: async (req, res, next) => {
    try {
      await securityAlertService.createAlert({
        title: 'Failed Login Attempt',
        description: `Failed login attempt from IP: ${req.ip}`,
        severity: req.failedAttempts >= 3 ? 'WARNING' : 'INFO',
        type: 'FAILED_LOGIN',
        ipAddress: req.ip,
        metadata: {
          userAgent: req.headers['user-agent'],
          failedAttempts: req.failedAttempts,
        },
      });

      next();
    } catch (error) {
      console.error('Failed to track login attempt:', error);
      next();
    }
  },

  // Middleware to track account lockouts
  trackAccountLockout: async (req, res, next) => {
    try {
      await securityAlertService.createAlert({
        title: 'Account Lockout',
        description: `Account locked due to excessive failed login attempts`,
        severity: 'WARNING',
        type: 'ACCOUNT_LOCKOUT',
        userId: req.user?.id,
        ipAddress: req.ip,
        metadata: {
          lockoutDuration: req.lockoutDuration,
          failedAttempts: req.failedAttempts,
        },
      });

      next();
    } catch (error) {
      console.error('Failed to track account lockout:', error);
      next();
    }
  },

  // Middleware to track password changes
  trackPasswordChange: async (req, res, next) => {
    try {
      await securityAlertService.createAlert({
        title: 'Password Change',
        description: `User changed their password`,
        severity: 'INFO',
        type: 'PASSWORD_CHANGE',
        userId: req.user.id,
        ipAddress: req.ip,
        metadata: {
          previousPasswordChangedAt: req.user.passwordChangedAt,
        },
      });

      next();
    } catch (error) {
      console.error('Failed to track password change:', error);
      next();
    }
  },

  // Middleware to track security violations
  trackSecurityViolation: async (req, res, next) => {
    try {
      await securityAlertService.createAlert({
        title: 'Security Violation',
        description: `Security violation detected: ${req.securityViolation}`,n
        severity: 'ERROR',
        type: 'SECURITY_VIOLATION',
        userId: req.user?.id,
        ipAddress: req.ip,
        metadata: {
          violationType: req.securityViolation,
          details: req.securityViolationDetails,
        },
      });

      next();
    } catch (error) {
      console.error('Failed to track security violation:', error);
      next();
    }
  },

  // Middleware to track system errors
  trackSystemError: async (req, res, next) => {
    try {
      await securityAlertService.createAlert({
        title: 'System Error',
        description: `System error occurred: ${req.error.message}`,n
        severity: 'ERROR',
        type: 'SYSTEM_ERROR',
        userId: req.user?.id,
        ipAddress: req.ip,
        metadata: {
          error: req.error,
          stack: req.error.stack,
        },
      });

      next();
    } catch (error) {
      console.error('Failed to track system error:', error);
      next();
    }
  },

  // Middleware to track configuration changes
  trackConfigChange: async (req, res, next) => {
    try {
      await securityAlertService.createAlert({
        title: 'Configuration Change',
        description: `Configuration changed: ${req.configChange}`,n
        severity: 'WARNING',
        type: 'CONFIG_CHANGE',
        userId: req.user?.id,
        ipAddress: req.ip,
        metadata: {
          changes: req.configChanges,
        },
      });

      next();
    } catch (error) {
      console.error('Failed to track configuration change:', error);
      next();
    }
  },
};

module.exports = securityAlertMiddleware;
