const { securityAlertService } = require('./securityAlertService');
const { performanceMonitor } = require('./performanceMonitor');
const { Op } = require('sequelize');
const User = require('../models/User');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const securityAuditService = {
  async createAuditLog({
    userId,
    action,
    resource,
    resourceId,
    success,
    ip,
    userAgent,
    metadata = {}
  }) {
    try {
      const auditLog = {
        id: crypto.randomUUID(),
        userId,
        action,
        resource,
        resourceId,
        success,
        ip,
        userAgent,
        metadata,
        timestamp: new Date()
      };

      // Save to database
      await User.createAuditLog(auditLog);

      // Save to file system for backup
      await this.saveAuditLogToFile(auditLog);

      // Monitor suspicious activities
      await this.monitorSuspiciousActivity(auditLog);

      // Create security alert if needed
      if (!success) {
        await securityAlertService.createAlert({
          title: 'Failed Security Action',
          description: `Failed ${action} attempt on ${resource}`,
          severity: 'WARNING',
          type: 'FAILED_SECURITY_ACTION',
          metadata: {
            ...auditLog,
            reason: metadata.error || 'Unknown error'
          }
        });
      }

      return auditLog;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Audit Log Creation Failed',
        description: `Failed to create audit log: ${error.message}`,
        severity: 'ERROR',
        type: 'AUDIT_LOG_CREATION_FAILED',
        metadata: {
          error: error.message,
          action,
          resource,
          ip
        }
      });

      throw error;
    }
  },

  async saveAuditLogToFile(auditLog) {
    try {
      const auditDir = path.join(__dirname, '../../audit-logs');
      await fs.mkdir(auditDir, { recursive: true });

      const date = new Date(auditLog.timestamp).toISOString().split('T')[0];
      const logFile = path.join(auditDir, `${date}.jsonl`);

      const logEntry = JSON.stringify(auditLog);
      await fs.appendFile(logFile, `${logEntry}\n`);

      // Rotate logs if needed
      await this.rotateLogs();
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Audit Log File Save Failed',
        description: `Failed to save audit log to file: ${error.message}`,
        severity: 'ERROR',
        type: 'AUDIT_LOG_FILE_SAVE_FAILED',
        metadata: {
          error: error.message,
          logFile: path.basename(logFile)
        }
      });

      throw error;
    }
  },

  async rotateLogs() {
    try {
      const auditDir = path.join(__dirname, '../../audit-logs');
      const files = await fs.readdir(auditDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - process.env.AUDIT_LOG_RETENTION_DAYS);

      for (const file of files) {
        const filePath = path.join(auditDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.birthtime < cutoffDate) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Audit Log Rotation Failed',
        description: `Failed to rotate audit logs: ${error.message}`,
        severity: 'ERROR',
        type: 'AUDIT_LOG_ROTATION_FAILED',
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  },

  async monitorSuspiciousActivity(auditLog) {
    try {
      // Check for multiple failed attempts from same IP
      const failedAttempts = await User.count({
        where: {
          lastFailedLogin: {
            [Op.gt]: new Date(Date.now() - 3600000) // Last hour
          },
          ip: auditLog.ip
        }
      });

      if (failedAttempts >= process.env.MAX_FAILED_ATTEMPTS) {
        await securityAlertService.createAlert({
          title: 'Suspicious Activity Detected',
          description: `Multiple failed attempts from IP: ${auditLog.ip}`,
          severity: 'WARNING',
          type: 'SUSPICIOUS_ACTIVITY',
          metadata: {
            ip: auditLog.ip,
            attempts: failedAttempts,
            resource: auditLog.resource
          }
        });
      }

      // Check for unusual access patterns
      const recentAccesses = await User.findAll({
        where: {
          lastLogin: {
            [Op.gt]: new Date(Date.now() - 3600000) // Last hour
          }
        }
      });

      if (recentAccesses.length > process.env.MAX_ACCESS_PER_HOUR) {
        await securityAlertService.createAlert({
          title: 'Unusual Access Pattern',
          description: 'Unusually high number of accesses detected',
          severity: 'WARNING',
          type: 'UNUSUAL_ACCESS_PATTERN',
          metadata: {
            accessCount: recentAccesses.length,
            threshold: process.env.MAX_ACCESS_PER_HOUR
          }
        });
      }

      // Check for geographical anomalies
      if (auditLog.metadata?.location) {
        const lastLocation = await User.findOne({
          where: { id: auditLog.userId },
          attributes: ['lastLoginLocation']
        });

        if (lastLocation && lastLocation.lastLoginLocation !== auditLog.metadata.location) {
          await securityAlertService.createAlert({
            title: 'Geographical Anomaly Detected',
            description: 'Login from different location than last login',
            severity: 'WARNING',
            type: 'GEOGRAPHICAL_ANOMALY',
            metadata: {
              userId: auditLog.userId,
              newLocation: auditLog.metadata.location,
              lastLocation: lastLocation.lastLoginLocation
            }
          });
        }
      }
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Activity Monitoring Failed',
        description: `Failed to monitor suspicious activity: ${error.message}`,
        severity: 'ERROR',
        type: 'ACTIVITY_MONITORING_FAILED',
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  },

  async getAuditLogs({
    userId,
    action,
    resource,
    startDate,
    endDate,
    limit = 100,
    offset = 0
  }) {
    try {
      const where = {};

      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (resource) where.resource = resource;

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

      const auditLogs = await User.findAll({
        where,
        limit,
        offset,
        order: [['timestamp', 'DESC']]
      });

      return auditLogs;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Audit Log Retrieval Failed',
        description: `Failed to retrieve audit logs: ${error.message}`,
        severity: 'ERROR',
        type: 'AUDIT_LOG_RETRIEVAL_FAILED',
        metadata: {
          error: error.message,
          query: {
            userId,
            action,
            resource,
            startDate,
            endDate
          }
        }
      });

      throw error;
    }
  },

  async generateSecurityReport() {
    try {
      const report = {
        timestamp: new Date(),
        statistics: {
          totalUsers: await User.count(),
          activeUsers: await User.count({
            where: {
              lastLogin: {
                [Op.gt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
              }
            }
          }),
          failedAttempts: await User.count({
            where: {
              lastFailedLogin: {
                [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            }
          }),
          securityAlerts: await securityAlertService.getAlerts({
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }).length
        },
        suspiciousActivities: await this.getSuspiciousActivities(),
        recommendations: this.generateRecommendations()
      };

      // Save report to file
      await this.saveReportToFile(report);

      return report;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Security Report Generation Failed',
        description: `Failed to generate security report: ${error.message}`,
        severity: 'ERROR',
        type: 'SECURITY_REPORT_FAILED',
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  },

  async getSuspiciousActivities() {
    try {
      const activities = [];

      // Check for multiple failed login attempts
      const failedAttempts = await User.findAll({
        where: {
          lastFailedLogin: {
            [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      if (failedAttempts.length > process.env.MAX_FAILED_ATTEMPTS_PER_DAY) {
        activities.push({
          type: 'MULTIPLE_FAILED_ATTEMPTS',
          count: failedAttempts.length,
          threshold: process.env.MAX_FAILED_ATTEMPTS_PER_DAY
        });
      }

      // Check for unusual access patterns
      const recentAccesses = await User.findAll({
        where: {
          lastLogin: {
            [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      if (recentAccesses.length > process.env.MAX_ACCESS_PER_DAY) {
        activities.push({
          type: 'UNUSUAL_ACCESS_PATTERN',
          count: recentAccesses.length,
          threshold: process.env.MAX_ACCESS_PER_DAY
        });
      }

      return activities;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Suspicious Activity Detection Failed',
        description: `Failed to detect suspicious activities: ${error.message}`,
        severity: 'ERROR',
        type: 'SUSPICIOUS_ACTIVITY_DETECTION_FAILED',
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  },

  generateRecommendations() {
    const recommendations = [];

    // Check for weak passwords
    if (process.env.PASSWORD_STRENGTH_SCORE < 80) {
      recommendations.push({
        priority: 'HIGH',
        description: 'Implement stronger password requirements',
        action: 'Update password policy to require minimum length, special characters, and no dictionary words'
      });
    }

    // Check for outdated security patches
    if (process.env.LAST_SECURITY_UPDATE < Date.now() - 30 * 24 * 60 * 60 * 1000) {
      recommendations.push({
        priority: 'HIGH',
        description: 'Update security patches',
        action: 'Schedule immediate security patch update'
      });
    }

    // Check for unused accounts
    if (process.env.UNUSED_ACCOUNT_THRESHOLD > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        description: 'Review inactive accounts',
        action: 'Conduct audit of inactive accounts and implement account cleanup policy'
      });
    }

    return recommendations;
  },

  async saveReportToFile(report) {
    try {
      const reportDir = path.join(__dirname, '../../security-reports');
      await fs.mkdir(reportDir, { recursive: true });

      const reportFile = path.join(
        reportDir,
        `security-report-${new Date(report.timestamp).toISOString().split('T')[0]}.json`
      );

      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      // Rotate reports if needed
      await this.rotateReports();
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Security Report Save Failed',
        description: `Failed to save security report: ${error.message}`,
        severity: 'ERROR',
        type: 'SECURITY_REPORT_SAVE_FAILED',
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  },

  async rotateReports() {
    try {
      const reportDir = path.join(__dirname, '../../security-reports');
      const files = await fs.readdir(reportDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - process.env.SECURITY_REPORT_RETENTION_DAYS);

      for (const file of files) {
        const filePath = path.join(reportDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.birthtime < cutoffDate) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Security Report Rotation Failed',
        description: `Failed to rotate security reports: ${error.message}`,
        severity: 'ERROR',
        type: 'SECURITY_REPORT_ROTATION_FAILED',
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  }
};

module.exports = securityAuditService;
