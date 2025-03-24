const SecurityAlert = require('../models/SecurityAlert');
const { auditLogService } = require('./auditLogService');
const { ApiError } = require('../middleware/errorHandler');
const nodemailer = require('nodemailer');

// Configure email transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.NODE_ENV === 'production',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const securityAlertService = {
  async createAlert({
    title,
    description,
    severity,
    type,
    userId,
    ipAddress,
    metadata,
  }) {
    try {
      const alert = await SecurityAlert.create({
        title,
        description,
        severity,
        type,
        userId,
        ipAddress,
        metadata,
      });

      // Log the alert
      await auditLogService.logAction({
        action: 'SECURITY_ALERT_CREATED',
        entity: 'SecurityAlert',
        entityId: alert.id,
        description: `Created security alert: ${title}`,
        severity,
        metadata: {
          alertId: alert.id,
          type,
        },
      });

      // Send notification based on severity
      await securityAlertService.sendNotification(alert);

      return alert;
    } catch (error) {
      throw new ApiError(500, 'Failed to create security alert', [error.message]);
    }
  },

  async getAlerts({
    userId,
    severity,
    type,
    status,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  }) {
    try {
      const where = {};

      if (userId) where.userId = userId;
      if (severity) where.severity = severity;
      if (type) where.type = type;
      if (status) where.status = status;

      if (startDate) {
        where.createdAt = {
          [Op.gte]: startDate,
        };
      }

      if (endDate) {
        if (!where.createdAt) {
          where.createdAt = {};
        }
        where.createdAt[Op.lte] = endDate;
      }

      const alerts = await SecurityAlert.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email'],
          },
          {
            model: User,
            as: 'acknowledgedBy',
            attributes: ['id', 'name'],
          },
          {
            model: User,
            as: 'resolvedBy',
            attributes: ['id', 'name'],
          },
        ],
      });

      return alerts;
    } catch (error) {
      throw new ApiError(500, 'Failed to fetch security alerts', [error.message]);
    }
  },

  async acknowledgeAlert(alertId, userId) {
    try {
      const alert = await SecurityAlert.findByPk(alertId);
      if (!alert) {
        throw new ApiError(404, 'Security alert not found');
      }

      await alert.update({
        status: 'ACKNOWLEDGED',
        acknowledgedBy: userId,
      });

      await auditLogService.logAction({
        action: 'SECURITY_ALERT_ACKNOWLEDGED',
        entity: 'SecurityAlert',
        entityId: alert.id,
        description: 'Security alert acknowledged',
        userId,
        metadata: {
          alertId,
          status: 'ACKNOWLEDGED',
        },
      });

      return alert;
    } catch (error) {
      throw new ApiError(500, 'Failed to acknowledge security alert', [error.message]);
    }
  },

  async resolveAlert(alertId, userId, resolution) {
    try {
      const alert = await SecurityAlert.findByPk(alertId);
      if (!alert) {
        throw new ApiError(404, 'Security alert not found');
      }

      await alert.update({
        status: 'RESOLVED',
        resolvedBy: userId,
        metadata: {
          ...alert.metadata,
          resolution,
        },
      });

      await auditLogService.logAction({
        action: 'SECURITY_ALERT_RESOLVED',
        entity: 'SecurityAlert',
        entityId: alert.id,
        description: 'Security alert resolved',
        userId,
        metadata: {
          alertId,
          status: 'RESOLVED',
          resolution,
        },
      });

      return alert;
    } catch (error) {
      throw new ApiError(500, 'Failed to resolve security alert', [error.message]);
    }
  },

  async sendNotification(alert) {
    try {
      // Determine notification recipients based on severity
      const recipients = await securityAlertService.getNotificationRecipients(alert.severity);

      if (recipients.length === 0) return;

      // Send email notification
      const mailOptions = {
        from: process.env.SMTP_FROM || 'security@yourdomain.com',
        to: recipients.join(','),
        subject: `[${alert.severity}] Security Alert: ${alert.title}`,
        html: `
          <h2>Security Alert: ${alert.title}</h2>
          <p><strong>Severity:</strong> ${alert.severity}</p>
          <p><strong>Type:</strong> ${alert.type}</p>
          <p><strong>Description:</strong> ${alert.description}</p>
          <p><strong>Status:</strong> ${alert.status}</p>
          <p><strong>Timestamp:</strong> ${alert.createdAt.toLocaleString()}</p>
          ${alert.userId ? `<p><strong>User:</strong> ${alert.user.name} (${alert.user.email})</p>` : ''}
          ${alert.ipAddress ? `<p><strong>IP Address:</strong> ${alert.ipAddress}</p>` : ''}
          ${alert.metadata ? `<p><strong>Additional Info:</strong></p><pre>${JSON.stringify(alert.metadata, null, 2)}</pre>` : ''}
        `
      };

      await transporter.sendMail(mailOptions);

      // Log notification
      await auditLogService.logAction({
        action: 'SECURITY_ALERT_NOTIFICATION_SENT',
        entity: 'SecurityAlert',
        entityId: alert.id,
        description: 'Security alert notification sent',
        metadata: {
          alertId: alert.id,
          recipients: recipients.length,
        },
      });
    } catch (error) {
      console.error('Failed to send security alert notification:', error);
      // Don't throw error - we don't want to fail alert creation if notification fails
    }
  },

  async getNotificationRecipients(severity) {
    try {
      // Get admin users
      const admins = await User.findAll({
        where: {
          role: 'admin',
          isVerified: true,
        },
        attributes: ['email'],
      });

      // Get additional recipients based on severity
      let additionalRecipients = [];

      if (severity === 'CRITICAL') {
        // Add security team emails from environment
        if (process.env.SECURITY_TEAM_EMAILS) {
          additionalRecipients = process.env.SECURITY_TEAM_EMAILS.split(',');
        }
      } else if (severity === 'ERROR') {
        // Add ops team emails from environment
        if (process.env.OPS_TEAM_EMAILS) {
          additionalRecipients = process.env.OPS_TEAM_EMAILS.split(',');
        }
      }

      // Combine and deduplicate recipients
      const allRecipients = [...new Set([
        ...admins.map(admin => admin.email),
        ...additionalRecipients
      ])];

      return allRecipients;
    } catch (error) {
      console.error('Failed to get notification recipients:', error);
      return [];
    }
  },

  async cleanupOldAlerts(retentionDays = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await SecurityAlert.destroy({
        where: {
          createdAt: {
            [Op.lt]: cutoffDate,
          },
          status: 'RESOLVED',
        },
      });

      await auditLogService.logAction({
        action: 'SECURITY_ALERTS_CLEANUP',
        entity: 'SecurityAlert',
        description: 'Cleaned up old security alerts',
        metadata: {
          deleted: result,
          retentionDays,
        },
      });

      return result;
    } catch (error) {
      throw new ApiError(500, 'Failed to clean up old security alerts', [error.message]);
    }
  },
};

module.exports = securityAlertService;
