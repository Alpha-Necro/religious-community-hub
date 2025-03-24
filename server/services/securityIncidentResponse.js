const { securityAlertService } = require('./securityAlertService');
const { performanceMonitor } = require('./performanceMonitor');
const { securityAuditService } = require('./securityAuditService');
const { Op } = require('sequelize');
const User = require('../models/User');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const securityIncidentResponse = {
  async handleIncident({
    type,
    severity,
    description,
    ip,
    userId,
    metadata = {}
  }) {
    try {
      // Create incident record
      const incidentId = crypto.randomUUID();
      const incident = {
        id: incidentId,
        type,
        severity,
        description,
        ip,
        userId,
        metadata,
        status: 'IN_PROGRESS',
        timestamp: new Date()
      };

      // Save to database
      await User.createIncident(incident);

      // Save to file system for backup
      await this.saveIncidentToFile(incident);

      // Create security alert
      await securityAlertService.createAlert({
        title: `Security Incident: ${type}`,
        description,
        severity,
        type: 'SECURITY_INCIDENT',
        metadata: {
          ...incident,
          incidentId
        }
      });

      // Trigger appropriate response based on severity
      switch (severity) {
        case 'CRITICAL':
          await this.handleCriticalIncident(incident);
          break;
        case 'HIGH':
          await this.handleHighIncident(incident);
          break;
        case 'MEDIUM':
          await this.handleMediumIncident(incident);
          break;
        case 'LOW':
          await this.handleLowIncident(incident);
          break;
        default:
          await this.handleDefaultIncident(incident);
      }

      return incident;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Incident Handling Failed',
        description: `Failed to handle security incident: ${error.message}`,
        severity: 'ERROR',
        type: 'INCIDENT_HANDLING_FAILED',
        metadata: {
          error: error.message,
          incidentType: type
        }
      });

      throw error;
    }
  },

  async saveIncidentToFile(incident) {
    try {
      const incidentDir = path.join(__dirname, '../../security-incidents');
      await fs.mkdir(incidentDir, { recursive: true });

      const date = new Date(incident.timestamp).toISOString().split('T')[0];
      const incidentFile = path.join(incidentDir, `${date}.jsonl`);

      const incidentEntry = JSON.stringify(incident);
      await fs.appendFile(incidentFile, `${incidentEntry}\n`);

      // Rotate logs if needed
      await this.rotateIncidents();
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Incident File Save Failed',
        description: `Failed to save incident to file: ${error.message}`,
        severity: 'ERROR',
        type: 'INCIDENT_FILE_SAVE_FAILED',
        metadata: {
          error: error.message,
          incidentId: incident.id
        }
      });

      throw error;
    }
  },

  async rotateIncidents() {
    try {
      const incidentDir = path.join(__dirname, '../../security-incidents');
      const files = await fs.readdir(incidentDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - process.env.INCIDENT_RETENTION_DAYS);

      for (const file of files) {
        const filePath = path.join(incidentDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.birthtime < cutoffDate) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Incident Rotation Failed',
        description: `Failed to rotate incidents: ${error.message}`,
        severity: 'ERROR',
        type: 'INCIDENT_ROTATION_FAILED',
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  },

  async handleCriticalIncident(incident) {
    try {
      // Block IP immediately
      await securityAuditService.blockIP(incident.ip);

      // Lock user account if applicable
      if (incident.userId) {
        await User.update({
          accountLocked: true,
          lockReason: `Security incident: ${incident.type}`
        }, {
          where: { id: incident.userId }
        });
      }

      // Notify security team immediately
      await this.notifySecurityTeam({
        incident,
        urgency: 'IMMEDIATE',
        action: 'BLOCKED_IP_AND_LOCKED_ACCOUNT'
      });

      // Create security audit log
      await securityAuditService.createAuditLog({
        userId: incident.userId,
        action: 'INCIDENT_RESPONSE',
        resource: 'SECURITY',
        resourceId: incident.id,
        success: true,
        ip: incident.ip,
        userAgent: incident.metadata.userAgent,
        metadata: {
          action: 'BLOCKED_IP_AND_LOCKED_ACCOUNT',
          reason: incident.description
        }
      });
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Critical Incident Response Failed',
        description: `Failed to handle critical incident: ${error.message}`,
        severity: 'ERROR',
        type: 'CRITICAL_INCIDENT_RESPONSE_FAILED',
        metadata: {
          error: error.message,
          incidentId: incident.id
        }
      });

      throw error;
    }
  },

  async handleHighIncident(incident) {
    try {
      // Rate limit IP
      await securityAuditService.rateLimitIP(incident.ip);

      // Monitor user activity
      if (incident.userId) {
        await User.update({
          monitoringEnabled: true,
          monitoringReason: `Security incident: ${incident.type}`
        }, {
          where: { id: incident.userId }
        });
      }

      // Notify security team
      await this.notifySecurityTeam({
        incident,
        urgency: 'HIGH',
        action: 'RATE_LIMITED_IP_AND_MONITORING_ENABLED'
      });

      // Create security audit log
      await securityAuditService.createAuditLog({
        userId: incident.userId,
        action: 'INCIDENT_RESPONSE',
        resource: 'SECURITY',
        resourceId: incident.id,
        success: true,
        ip: incident.ip,
        userAgent: incident.metadata.userAgent,
        metadata: {
          action: 'RATE_LIMITED_IP_AND_MONITORING_ENABLED',
          reason: incident.description
        }
      });
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'High Incident Response Failed',
        description: `Failed to handle high incident: ${error.message}`,
        severity: 'ERROR',
        type: 'HIGH_INCIDENT_RESPONSE_FAILED',
        metadata: {
          error: error.message,
          incidentId: incident.id
        }
      });

      throw error;
    }
  },

  async handleMediumIncident(incident) {
    try {
      // Monitor IP
      await securityAuditService.monitorIP(incident.ip);

      // Log suspicious activity
      await securityAuditService.createAuditLog({
        userId: incident.userId,
        action: 'SUSPICIOUS_ACTIVITY',
        resource: 'SECURITY',
        resourceId: incident.id,
        success: true,
        ip: incident.ip,
        userAgent: incident.metadata.userAgent,
        metadata: {
          action: 'MONITORING_IP',
          reason: incident.description
        }
      });

      // Create security audit log
      await securityAuditService.createAuditLog({
        userId: incident.userId,
        action: 'INCIDENT_RESPONSE',
        resource: 'SECURITY',
        resourceId: incident.id,
        success: true,
        ip: incident.ip,
        userAgent: incident.metadata.userAgent,
        metadata: {
          action: 'MONITORING_IP',
          reason: incident.description
        }
      });
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Medium Incident Response Failed',
        description: `Failed to handle medium incident: ${error.message}`,
        severity: 'ERROR',
        type: 'MEDIUM_INCIDENT_RESPONSE_FAILED',
        metadata: {
          error: error.message,
          incidentId: incident.id
        }
      });

      throw error;
    }
  },

  async handleLowIncident(incident) {
    try {
      // Log incident
      await securityAuditService.createAuditLog({
        userId: incident.userId,
        action: 'SUSPICIOUS_ACTIVITY',
        resource: 'SECURITY',
        resourceId: incident.id,
        success: true,
        ip: incident.ip,
        userAgent: incident.metadata.userAgent,
        metadata: {
          action: 'LOGGED_INCIDENT',
          reason: incident.description
        }
      });

      // Create security audit log
      await securityAuditService.createAuditLog({
        userId: incident.userId,
        action: 'INCIDENT_RESPONSE',
        resource: 'SECURITY',
        resourceId: incident.id,
        success: true,
        ip: incident.ip,
        userAgent: incident.metadata.userAgent,
        metadata: {
          action: 'LOGGED_INCIDENT',
          reason: incident.description
        }
      });
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Low Incident Response Failed',
        description: `Failed to handle low incident: ${error.message}`,
        severity: 'ERROR',
        type: 'LOW_INCIDENT_RESPONSE_FAILED',
        metadata: {
          error: error.message,
          incidentId: incident.id
        }
      });

      throw error;
    }
  },

  async handleDefaultIncident(incident) {
    try {
      // Log incident
      await securityAuditService.createAuditLog({
        userId: incident.userId,
        action: 'SUSPICIOUS_ACTIVITY',
        resource: 'SECURITY',
        resourceId: incident.id,
        success: true,
        ip: incident.ip,
        userAgent: incident.metadata.userAgent,
        metadata: {
          action: 'LOGGED_DEFAULT_INCIDENT',
          reason: incident.description
        }
      });

      // Create security audit log
      await securityAuditService.createAuditLog({
        userId: incident.userId,
        action: 'INCIDENT_RESPONSE',
        resource: 'SECURITY',
        resourceId: incident.id,
        success: true,
        ip: incident.ip,
        userAgent: incident.metadata.userAgent,
        metadata: {
          action: 'LOGGED_DEFAULT_INCIDENT',
          reason: incident.description
        }
      });
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Default Incident Response Failed',
        description: `Failed to handle default incident: ${error.message}`,
        severity: 'ERROR',
        type: 'DEFAULT_INCIDENT_RESPONSE_FAILED',
        metadata: {
          error: error.message,
          incidentId: incident.id
        }
      });

      throw error;
    }
  },

  async notifySecurityTeam({ incident, urgency, action }) {
    try {
      const notification = {
        incidentId: incident.id,
        type: incident.type,
        severity: incident.severity,
        description: incident.description,
        ip: incident.ip,
        userId: incident.userId,
        metadata: incident.metadata,
        urgency,
        action,
        timestamp: new Date()
      };

      // Send email notification
      await this.sendEmailNotification(notification);

      // Send SMS notification
      await this.sendSMSNotification(notification);

      // Send Slack notification
      await this.sendSlackNotification(notification);

      // Create security audit log
      await securityAuditService.createAuditLog({
        userId: incident.userId,
        action: 'NOTIFICATION_SENT',
        resource: 'SECURITY',
        resourceId: incident.id,
        success: true,
        ip: incident.ip,
        userAgent: incident.metadata.userAgent,
        metadata: {
          action: 'NOTIFICATION_SENT',
          notificationType: 'EMAIL_SMS_SLACK',
          reason: incident.description
        }
      });
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Security Team Notification Failed',
        description: `Failed to notify security team: ${error.message}`,
        severity: 'ERROR',
        type: 'SECURITY_TEAM_NOTIFICATION_FAILED',
        metadata: {
          error: error.message,
          incidentId: incident.id
        }
      });

      throw error;
    }
  },

  async sendEmailNotification(notification) {
    try {
      // Implementation for sending email notification
      // This would typically use an email service like nodemailer
      // For now, we'll just log the notification
      console.log('Email notification sent:', notification);
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Email Notification Failed',
        description: `Failed to send email notification: ${error.message}`,
        severity: 'ERROR',
        type: 'EMAIL_NOTIFICATION_FAILED',
        metadata: {
          error: error.message,
          incidentId: notification.incidentId
        }
      });

      throw error;
    }
  },

  async sendSMSNotification(notification) {
    try {
      // Implementation for sending SMS notification
      // This would typically use an SMS service like Twilio
      // For now, we'll just log the notification
      console.log('SMS notification sent:', notification);
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'SMS Notification Failed',
        description: `Failed to send SMS notification: ${error.message}`,
        severity: 'ERROR',
        type: 'SMS_NOTIFICATION_FAILED',
        metadata: {
          error: error.message,
          incidentId: notification.incidentId
        }
      });

      throw error;
    }
  },

  async sendSlackNotification(notification) {
    try {
      // Implementation for sending Slack notification
      // This would typically use the Slack API
      // For now, we'll just log the notification
      console.log('Slack notification sent:', notification);
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Slack Notification Failed',
        description: `Failed to send Slack notification: ${error.message}`,
        severity: 'ERROR',
        type: 'SLACK_NOTIFICATION_FAILED',
        metadata: {
          error: error.message,
          incidentId: notification.incidentId
        }
      });

      throw error;
    }
  },

  async getIncidents({
    userId,
    type,
    severity,
    startDate,
    endDate,
    status,
    limit = 100,
    offset = 0
  }) {
    try {
      const where = {};

      if (userId) where.userId = userId;
      if (type) where.type = type;
      if (severity) where.severity = severity;
      if (status) where.status = status;

      if (startDate) {
        where.timestamp = {
          [Op.gte]: new Date(startDate)
        };
      }

      if (endDate) {
        if (!where.timestamp) {
          where.timestamp = {};
        }
        where.timestamp[Op.lte] = new Date(endDate);
      }

      const incidents = await User.findAll({
        where,
        limit,
        offset,
        order: [['timestamp', 'DESC']]
      });

      return incidents;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Incident Retrieval Failed',
        description: `Failed to retrieve incidents: ${error.message}`,
        severity: 'ERROR',
        type: 'INCIDENT_RETRIEVAL_FAILED',
        metadata: {
          error: error.message,
          query: {
            userId,
            type,
            severity,
            status,
            startDate,
            endDate
          }
        }
      });

      throw error;
    }
  },

  async updateIncidentStatus(incidentId, status, resolution = null) {
    try {
      const [updated] = await User.update({
        status,
        resolution,
        resolvedAt: new Date()
      }, {
        where: { id: incidentId }
      });

      if (updated) {
        // Create security audit log
        await securityAuditService.createAuditLog({
          userId: null,
          action: 'INCIDENT_STATUS_UPDATED',
          resource: 'SECURITY',
          resourceId: incidentId,
          success: true,
          ip: null,
          userAgent: null,
          metadata: {
            newStatus: status,
            resolution
          }
        });
      }

      return updated;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Incident Status Update Failed',
        description: `Failed to update incident status: ${error.message}`,
        severity: 'ERROR',
        type: 'INCIDENT_STATUS_UPDATE_FAILED',
        metadata: {
          error: error.message,
          incidentId
        }
      });

      throw error;
    }
  },

  async generateIncidentReport(incidentId) {
    try {
      const incident = await User.findOne({
        where: { id: incidentId }
      });

      if (!incident) {
        throw new Error('Incident not found');
      }

      const report = {
        incidentId: incident.id,
        type: incident.type,
        severity: incident.severity,
        description: incident.description,
        ip: incident.ip,
        userId: incident.userId,
        metadata: incident.metadata,
        status: incident.status,
        timestamp: incident.timestamp,
        resolvedAt: incident.resolvedAt,
        resolution: incident.resolution,
        timeline: await this.generateIncidentTimeline(incidentId)
      };

      // Save report to file
      await this.saveReportToFile(report);

      return report;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Incident Report Generation Failed',
        description: `Failed to generate incident report: ${error.message}`,
        severity: 'ERROR',
        type: 'INCIDENT_REPORT_FAILED',
        metadata: {
          error: error.message,
          incidentId
        }
      });

      throw error;
    }
  },

  async generateIncidentTimeline(incidentId) {
    try {
      const timeline = [];

      // Get audit logs related to incident
      const auditLogs = await securityAuditService.getAuditLogs({
        resourceId: incidentId,
        resource: 'SECURITY'
      });

      auditLogs.forEach(log => {
        timeline.push({
          timestamp: log.timestamp,
          action: log.action,
          success: log.success,
          metadata: log.metadata
        });
      });

      // Sort timeline chronologically
      timeline.sort((a, b) => a.timestamp - b.timestamp);

      return timeline;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Incident Timeline Generation Failed',
        description: `Failed to generate incident timeline: ${error.message}`,
        severity: 'ERROR',
        type: 'INCIDENT_TIMELINE_FAILED',
        metadata: {
          error: error.message,
          incidentId
        }
      });

      throw error;
    }
  },

  async saveReportToFile(report) {
    try {
      const reportDir = path.join(__dirname, '../../incident-reports');
      await fs.mkdir(reportDir, { recursive: true });

      const reportFile = path.join(
        reportDir,
        `incident-report-${report.incidentId}-${new Date(report.timestamp).toISOString().split('T')[0]}.json`
      );

      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      // Rotate reports if needed
      await this.rotateReports();
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Incident Report Save Failed',
        description: `Failed to save incident report: ${error.message}`,
        severity: 'ERROR',
        type: 'INCIDENT_REPORT_SAVE_FAILED',
        metadata: {
          error: error.message,
          incidentId: report.incidentId
        }
      });

      throw error;
    }
  },

  async rotateReports() {
    try {
      const reportDir = path.join(__dirname, '../../incident-reports');
      const files = await fs.readdir(reportDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - process.env.INCIDENT_REPORT_RETENTION_DAYS);

      for (const file of files) {
        const filePath = path.join(reportDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.birthtime < cutoffDate) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Incident Report Rotation Failed',
        description: `Failed to rotate incident reports: ${error.message}`,
        severity: 'ERROR',
        type: 'INCIDENT_REPORT_ROTATION_FAILED',
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  }
};

module.exports = securityIncidentResponse;
