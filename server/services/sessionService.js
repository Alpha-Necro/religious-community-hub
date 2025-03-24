const User = require('../models/User');
const { securityAlertService } = require('./securityAlertService');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const sessionService = {
  async createSession(userId, deviceId, userAgent, ip) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate session ID
      const sessionId = crypto.randomBytes(32).toString('hex');

      // Create session token
      const token = jwt.sign(
        {
          sessionId,
          userId,
          deviceId,
          userAgent,
          ip,
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        { 
          expiresIn: process.env.SESSION_EXPIRES_IN || '1h',
          algorithm: 'HS256'
        }
      );

      // Update user sessions
      const sessions = user.sessionTokens || [];
      sessions.push({
        id: sessionId,
        deviceId,
        userAgent,
        ip,
        createdAt: new Date(),
        lastActive: new Date(),
        token
      });

      await user.update({
        sessionTokens: sessions
      });

      await securityAlertService.createAlert({
        title: 'Session Created',
        description: `New session created for user ${user.id}`,
        severity: 'INFO',
        type: 'SESSION_CREATED',
        userId: user.id,
        metadata: {
          sessionId,
          deviceId,
          userAgent,
          ip
        }
      });

      return {
        token,
        sessionId,
        expiresAt: new Date(Date.now() + (process.env.SESSION_EXPIRES_IN || 3600) * 1000)
      };
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Session Creation Failed',
        description: `Failed to create session: ${error.message}`,
        severity: 'ERROR',
        type: 'SESSION_CREATION_FAILED',
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  },

  async validateSession(token) {
    try {
      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { sessionId, userId } = decoded;

      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Find session
      const session = (user.sessionTokens || []).find(s => 
        s.id === sessionId && 
        s.token === token
      );

      if (!session) {
        throw new Error('Invalid session');
      }

      // Update last active time
      const sessions = user.sessionTokens || [];
      const updatedSessions = sessions.map(s => 
        s.id === sessionId ? { ...s, lastActive: new Date() } : s
      );

      await user.update({
        sessionTokens: updatedSessions
      });

      return {
        valid: true,
        userId,
        sessionId,
        deviceId: decoded.deviceId,
        userAgent: decoded.userAgent,
        ip: decoded.ip,
        lastActive: session.lastActive
      };
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Invalid Session',
        description: `Invalid session: ${error.message}`,
        severity: 'WARNING',
        type: 'INVALID_SESSION',
        metadata: {
          error: error.message
        }
      });

      return {
        valid: false,
        error: error.message
      };
    }
  },

  async invalidateSession(token) {
    try {
      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { sessionId, userId } = decoded;

      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Remove session
      const sessions = (user.sessionTokens || []).filter(s => 
        s.id !== sessionId || s.token !== token
      );

      await user.update({
        sessionTokens: sessions
      });

      await securityAlertService.createAlert({
        title: 'Session Invalidated',
        description: `Session invalidated for user ${user.id}`,
        severity: 'INFO',
        type: 'SESSION_INVALIDATED',
        userId: user.id,
        metadata: {
          sessionId,
          token
        }
      });

      return true;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Session Invalidiation Failed',
        description: `Failed to invalidate session: ${error.message}`,
        severity: 'ERROR',
        type: 'SESSION_INVALIDATION_FAILED',
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  },

  async invalidateAllSessions(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Clear all sessions
      await user.update({
        sessionTokens: []
      });

      await securityAlertService.createAlert({
        title: 'All Sessions Invalidated',
        description: `All sessions invalidated for user ${user.id}`,
        severity: 'INFO',
        type: 'ALL_SESSIONS_INVALIDATED',
        userId: user.id
      });

      return true;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Session Invalidiation Failed',
        description: `Failed to invalidate all sessions: ${error.message}`,
        severity: 'ERROR',
        type: 'SESSION_INVALIDATION_FAILED',
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  },

  async cleanupExpiredSessions() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24); // Cleanup sessions older than 24 hours

      const users = await User.findAll({
        where: {
          sessionTokens: {
            [Op.ne]: null
          }
        }
      });

      let cleanedSessions = 0;

      for (const user of users) {
        const sessions = user.sessionTokens || [];
        const activeSessions = sessions.filter(s => {
          const lastActive = new Date(s.lastActive);
          return lastActive > cutoffDate;
        });

        if (activeSessions.length < sessions.length) {
          await user.update({
            sessionTokens: activeSessions
          });
          cleanedSessions += sessions.length - activeSessions.length;
        }
      }

      await securityAlertService.createAlert({
        title: 'Session Cleanup Completed',
        description: `Cleaned up ${cleanedSessions} expired sessions`,
        severity: 'INFO',
        type: 'SESSION_CLEANUP',
        metadata: {
          cleanedSessions,
          cutoffDate
        }
      });

      return cleanedSessions;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Session Cleanup Failed',
        description: `Failed to cleanup expired sessions: ${error.message}`,
        severity: 'ERROR',
        type: 'SESSION_CLEANUP_FAILED',
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  }
};

module.exports = sessionService;
