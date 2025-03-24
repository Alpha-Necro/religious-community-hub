const { securityAlertService } = require('./securityAlertService');
const { performanceMonitor } = require('./performanceMonitor');
const { securityAuditService } = require('./securityAuditService');
const { Op } = require('sequelize');
const User = require('../models/User');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const errorService = {
  errorTypes: {
    VALIDATION: 'VALIDATION_ERROR',
    AUTHENTICATION: 'AUTHENTICATION_ERROR',
    AUTHORIZATION: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND_ERROR',
    DUPLICATE: 'DUPLICATE_ERROR',
    TIMEOUT: 'TIMEOUT_ERROR',
    RATE_LIMIT: 'RATE_LIMIT_ERROR',
    SECURITY: 'SECURITY_ERROR',
    SYSTEM: 'SYSTEM_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
  },

  errorLevels: {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL'
  },

  createError({
    type = this.errorTypes.UNKNOWN,
    message,
    code,
    details = {},
    httpStatus = 500,
    level = this.errorLevels.ERROR
  }) {
    const error = new Error(message);
    error.name = type;
    error.code = code || type;
    error.details = details;
    error.httpStatus = httpStatus;
    error.level = level;

    // Create security alert if needed
    if (level === this.errorLevels.CRITICAL) {
      securityAlertService.createAlert({
        title: `Critical Error: ${type}`,
        description: message,
        severity: 'ERROR',
        type: 'CRITICAL_ERROR',
        metadata: {
          error: {
            type,
            code,
            message,
            details
          }
        }
      });
    }

    return error;
  },

  async handleError(error, req, res, next) {
    try {
      // Log error
      await this.logError(error, req);

      // Monitor error
      await this.monitorError(error);

      // Create audit log
      await this.createAuditLog(error, req);

      // Format response
      const response = this.formatErrorResponse(error);

      // Send response
      res.status(response.status).json(response);
    } catch (handlingError) {
      // Log error handling failure
      await this.logError(handlingError, req);

      // Send generic error response
      res.status(500).json({
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? handlingError.message : null
      });
    }
  },

  async logError(error, req) {
    try {
      const logEntry = {
        timestamp: new Date(),
        level: error.level || this.errorLevels.ERROR,
        type: error.name || this.errorTypes.UNKNOWN,
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack,
        request: {
          method: req.method,
          url: req.url,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        },
        response: {
          status: error.httpStatus || 500
        }
      };

      // Save to database
      await User.createErrorLog(logEntry);

      // Save to file system
      await this.saveErrorToFile(logEntry);

      // Monitor error rate
      await this.monitorErrorRate(error);
    } catch (error) {
      console.error('Failed to log error:', error);
      throw error;
    }
  },

  async saveErrorToFile(logEntry) {
    try {
      const errorDir = path.join(__dirname, '../../error-logs');
      await fs.mkdir(errorDir, { recursive: true });

      const date = new Date(logEntry.timestamp).toISOString().split('T')[0];
      const errorFile = path.join(errorDir, `${date}.jsonl`);

      const logEntryString = JSON.stringify(logEntry);
      await fs.appendFile(errorFile, `${logEntryString}\n`);

      // Rotate logs if needed
      await this.rotateLogs();
    } catch (error) {
      console.error('Failed to save error to file:', error);
      throw error;
    }
  },

  async rotateLogs() {
    try {
      const errorDir = path.join(__dirname, '../../error-logs');
      const files = await fs.readdir(errorDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - process.env.ERROR_LOG_RETENTION_DAYS);

      for (const file of files) {
        const filePath = path.join(errorDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.birthtime < cutoffDate) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to rotate error logs:', error);
      throw error;
    }
  },

  async monitorError(error) {
    try {
      // Increment error counter
      await User.increment('errorCount', {
        where: { id: error.userId }
      });

      // Check for error patterns
      const recentErrors = await User.findAll({
        where: {
          lastError: {
            [Op.gt]: new Date(Date.now() - 3600000) // Last hour
          },
          errorType: error.name
        }
      });

      if (recentErrors.length > process.env.ERROR_THRESHOLD) {
        securityAlertService.createAlert({
          title: 'Error Pattern Detected',
          description: `Multiple ${error.name} errors in short time`,
          severity: 'WARNING',
          type: 'ERROR_PATTERN',
          metadata: {
            errorType: error.name,
            count: recentErrors.length,
            threshold: process.env.ERROR_THRESHOLD
          }
        });
      }
    } catch (error) {
      console.error('Failed to monitor error:', error);
      throw error;
    }
  },

  async monitorErrorRate(error) {
    try {
      // Get error rate for last hour
      const errorCount = await User.count({
        where: {
          lastError: {
            [Op.gt]: new Date(Date.now() - 3600000) // Last hour
          }
        }
      });

      // Check if error rate exceeds threshold
      if (errorCount > process.env.ERROR_RATE_THRESHOLD) {
        securityAlertService.createAlert({
          title: 'High Error Rate',
          description: 'Error rate exceeds threshold',
          severity: 'WARNING',
          type: 'HIGH_ERROR_RATE',
          metadata: {
            errorCount,
            threshold: process.env.ERROR_RATE_THRESHOLD
          }
        });
      }
    } catch (error) {
      console.error('Failed to monitor error rate:', error);
      throw error;
    }
  },

  async createAuditLog(error, req) {
    try {
      await securityAuditService.createAuditLog({
        userId: req.user?.id,
        action: 'ERROR_OCCURRED',
        resource: 'SYSTEM',
        resourceId: error.code,
        success: false,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          error: {
            type: error.name,
            message: error.message,
            code: error.code,
            details: error.details
          },
          request: {
            method: req.method,
            url: req.url
          }
        }
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      throw error;
    }
  },

  formatErrorResponse(error) {
    const response = {
      error: error.message,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.details : null,
      status: error.httpStatus || 500
    };

    // Add additional fields for specific error types
    switch (error.name) {
      case this.errorTypes.VALIDATION:
        response.validationErrors = error.details?.errors || [];
        break;
      case this.errorTypes.AUTHENTICATION:
        response.authenticationError = true;
        break;
      case this.errorTypes.AUTHORIZATION:
        response.authorizationError = true;
        break;
      case this.errorTypes.NOT_FOUND:
        response.notFound = true;
        break;
      case this.errorTypes.DUPLICATE:
        response.duplicate = true;
        break;
      case this.errorTypes.TIMEOUT:
        response.timeout = true;
        break;
      case this.errorTypes.RATE_LIMIT:
        response.rateLimit = true;
        break;
      case this.errorTypes.SECURITY:
        response.securityError = true;
        break;
      case this.errorTypes.SYSTEM:
        response.systemError = true;
        break;
    }

    return response;
  },

  async getErrorLogs({
    userId,
    type,
    level,
    startDate,
    endDate,
    limit = 100,
    offset = 0
  }) {
    try {
      const where = {};

      if (userId) where.userId = userId;
      if (type) where.type = type;
      if (level) where.level = level;

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

      const errorLogs = await User.findAll({
        where,
        limit,
        offset,
        order: [['timestamp', 'DESC']]
      });

      return errorLogs;
    } catch (error) {
      console.error('Failed to get error logs:', error);
      throw error;
    }
  },

  async generateErrorReport() {
    try {
      const report = {
        timestamp: new Date(),
        statistics: {
          totalErrors: await User.count(),
          criticalErrors: await User.count({
            where: { level: this.errorLevels.CRITICAL }
          }),
          errorRate: await this.calculateErrorRate(),
          errorDistribution: await this.getErrorDistribution()
        },
        recentErrors: await this.getRecentErrors(),
        recommendations: this.generateRecommendations()
      };

      // Save report to file
      await this.saveReportToFile(report);

      return report;
    } catch (error) {
      console.error('Failed to generate error report:', error);
      throw error;
    }
  },

  async calculateErrorRate() {
    try {
      const recentErrors = await User.count({
        where: {
          lastError: {
            [Op.gt]: new Date(Date.now() - 3600000) // Last hour
          }
        }
      });

      const totalRequests = await User.count({
        where: {
          lastRequest: {
            [Op.gt]: new Date(Date.now() - 3600000) // Last hour
          }
        }
      });

      return (recentErrors / totalRequests) * 100;
    } catch (error) {
      console.error('Failed to calculate error rate:', error);
      throw error;
    }
  },

  async getErrorDistribution() {
    try {
      const distribution = {};

      const errorTypes = Object.values(this.errorTypes);
      for (const type of errorTypes) {
        const count = await User.count({
          where: {
            errorType: type,
            lastError: {
              [Op.gt]: new Date(Date.now() - 86400000) // Last 24 hours
            }
          }
        });

        distribution[type] = count;
      }

      return distribution;
    } catch (error) {
      console.error('Failed to get error distribution:', error);
      throw error;
    }
  },

  async getRecentErrors() {
    try {
      const recentErrors = await User.findAll({
        where: {
          lastError: {
            [Op.gt]: new Date(Date.now() - 3600000) // Last hour
          }
        },
        order: [['lastError', 'DESC']],
        limit: 10
      });

      return recentErrors;
    } catch (error) {
      console.error('Failed to get recent errors:', error);
      throw error;
    }
  },

  generateRecommendations() {
    const recommendations = [];

    // Check for high error rate
    if (process.env.ERROR_RATE_THRESHOLD < 1) {
      recommendations.push({
        priority: 'HIGH',
        description: 'Implement error rate monitoring',
        action: 'Set up error rate monitoring with threshold'
      });
    }

    // Check for error logging
    if (process.env.ERROR_LOG_RETENTION_DAYS < 30) {
      recommendations.push({
        priority: 'MEDIUM',
        description: 'Increase error log retention',
        action: 'Increase error log retention to at least 30 days'
      });
    }

    // Check for error handling
    if (process.env.ERROR_HANDLING_ENABLED !== 'true') {
      recommendations.push({
        priority: 'HIGH',
        description: 'Enable error handling',
        action: 'Enable error handling middleware'
      });
    }

    return recommendations;
  },

  async saveReportToFile(report) {
    try {
      const reportDir = path.join(__dirname, '../../error-reports');
      await fs.mkdir(reportDir, { recursive: true });

      const reportFile = path.join(
        reportDir,
        `error-report-${new Date(report.timestamp).toISOString().split('T')[0]}.json`
      );

      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      // Rotate reports if needed
      await this.rotateReports();
    } catch (error) {
      console.error('Failed to save error report:', error);
      throw error;
    }
  },

  async rotateReports() {
    try {
      const reportDir = path.join(__dirname, '../../error-reports');
      const files = await fs.readdir(reportDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - process.env.ERROR_REPORT_RETENTION_DAYS);

      for (const file of files) {
        const filePath = path.join(reportDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.birthtime < cutoffDate) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to rotate error reports:', error);
      throw error;
    }
  }
};

module.exports = errorService;
