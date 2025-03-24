const { securityAuditService } = require('./securityAuditService');
const { Op } = require('sequelize');
const User = require('../models/User');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const { format } = require('logform');

const errorLoggingService = {
  logLevels: {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG',
    TRACE: 'TRACE'
  },

  errorTypes: {
    APPLICATION: 'APPLICATION',
    SYSTEM: 'SYSTEM',
    SECURITY: 'SECURITY',
    PERFORMANCE: 'PERFORMANCE',
    DATABASE: 'DATABASE',
    NETWORK: 'NETWORK',
    AUTHENTICATION: 'AUTHENTICATION'
  },

  errorSources: {
    API: 'API',
    DATABASE: 'DATABASE',
    CACHE: 'CACHE',
    FILE_SYSTEM: 'FILE_SYSTEM',
    NETWORK: 'NETWORK',
    SECURITY: 'SECURITY',
    PERFORMANCE: 'PERFORMANCE'
  },

  initialize: async () => {
    try {
      // Initialize Winston logger
      this.logger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: format.combine(
          format.timestamp(),
          format.json()
        ),
        transports: [
          new winston.transports.File({
            filename: 'error.log',
            level: 'error'
          }),
          new winston.transports.File({
            filename: 'combined.log'
          })
        ]
      });

      // Add console transport in development
      if (process.env.NODE_ENV !== 'production') {
        this.logger.add(new winston.transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple()
          )
        }));
      }

      // Initialize error configuration
      this.config = {
        maxLogSize: process.env.MAX_LOG_SIZE || 100000000, // 100MB
        maxLogFiles: process.env.MAX_LOG_FILES || 1000,
        maxErrorRetention: process.env.MAX_ERROR_RETENTION || 30, // days
        errorThreshold: process.env.ERROR_THRESHOLD || 100,
        errorRateThreshold: process.env.ERROR_RATE_THRESHOLD || 0.01,
        errorWindow: process.env.ERROR_WINDOW || 60000 // 1 minute
      };

      // Initialize error statistics
      this.stats = {
        errors: 0,
        errorRate: 0,
        lastErrorTime: 0,
        errorWindow: this.config.errorWindow
      };

      // Initialize error monitoring
      this.monitoringInterval = setInterval(() => {
        this.monitorErrors();
      }, this.config.errorWindow);

      return true;
    } catch (error) {
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'ERROR_LOGGING_INITIALIZATION_FAILED',
        resource: 'ERROR_LOGGING',
        resourceId: null,
        success: false,
        ip: null,
        userAgent: null,
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  },

  logError: async (error, options = {}) => {
    try {
      // Create error ID
      const errorId = crypto.randomUUID();

      // Create error context
      const context = {
        id: errorId,
        timestamp: new Date(),
        level: options.level || this.logLevels.ERROR,
        type: options.type || this.errorTypes.APPLICATION,
        source: options.source || this.errorSources.API,
        message: error.message,
        stack: error.stack,
        code: error.code || 'UNKNOWN_ERROR',
        details: options.details || {},
        metadata: options.metadata || {},
        userId: options.userId,
        ip: options.ip,
        userAgent: options.userAgent
      };

      // Log to Winston
      this.logger.log(context.level, context);

      // Save to database
      await User.createErrorLog(context);

      // Update error statistics
      this.updateErrorStatistics();

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: context.userId,
        action: 'ERROR_LOGGED',
        resource: 'ERROR_LOGGING',
        resourceId: errorId,
        success: true,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: {
          error: context
        }
      });

      return errorId;
    } catch (error) {
      throw error;
    }
  },

  monitorErrors: async () => {
    try {
      // Get error statistics
      const stats = await User.getErrorStatistics(this.config.errorWindow);

      // Check error threshold
      if (stats.errors > this.config.errorThreshold) {
        await this.createErrorAlert({
          title: 'High Error Rate Detected',
          description: `Error rate above threshold: ${stats.errors} errors in last ${this.config.errorWindow/1000} seconds`,
          severity: 'CRITICAL',
          type: 'ERROR_RATE_HIGH',
          metadata: {
            errors: stats.errors,
            threshold: this.config.errorThreshold,
            window: this.config.errorWindow
          }
        });
      }

      // Check error rate
      if (stats.errorRate > this.config.errorRateThreshold) {
        await this.createErrorAlert({
          title: 'High Error Rate Detected',
          description: `Error rate above threshold: ${stats.errorRate.toFixed(2)}%`,
          severity: 'WARNING',
          type: 'ERROR_RATE_HIGH',
          metadata: {
            errorRate: stats.errorRate,
            threshold: this.config.errorRateThreshold
          }
        });
      }

      // Update error statistics
      this.stats = {
        errors: stats.errors,
        errorRate: stats.errorRate,
        lastErrorTime: stats.lastErrorTime,
        errorWindow: this.config.errorWindow
      };
    } catch (error) {
      throw error;
    }
  },

  createErrorAlert: async (alert) => {
    try {
      // Create alert
      const alertId = crypto.randomUUID();
      const alertData = {
        id: alertId,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        type: alert.type,
        metadata: alert.metadata,
        timestamp: new Date(),
        status: 'ACTIVE'
      };

      // Save alert to database
      await User.createErrorAlert(alertData);

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'ERROR_ALERT_CREATED',
        resource: 'ERROR_MONITORING',
        resourceId: alertId,
        success: true,
        ip: null,
        userAgent: null,
        metadata: {
          alert: alertData
        }
      });

      return alertId;
    } catch (error) {
      throw error;
    }
  },

  getErrorLogs: async (options = {}) => {
    try {
      const logs = await User.getErrorLogs({
        limit: options.limit || 100,
        type: options.type,
        source: options.source,
        userId: options.userId,
        startTime: options.startTime,
        endTime: options.endTime
      });

      return logs;
    } catch (error) {
      throw error;
    }
  },

  getErrorStatistics: async (window = this.config.errorWindow) => {
    try {
      const stats = await User.getErrorStatistics(window);

      return {
        errors: stats.errors,
        errorRate: stats.errorRate,
        lastErrorTime: stats.lastErrorTime,
        window: window
      };
    } catch (error) {
      throw error;
    }
  },

  getErrorAlerts: async (options = {}) => {
    try {
      const alerts = await User.getErrorAlerts({
        limit: options.limit || 100,
        type: options.type,
        severity: options.severity,
        startTime: options.startTime,
        endTime: options.endTime
      });

      return alerts;
    } catch (error) {
      throw error;
    }
  },

  updateErrorAlert: async (alertId, status) => {
    try {
      // Update alert status
      await User.updateErrorAlert(alertId, status);

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'ERROR_ALERT_UPDATED',
        resource: 'ERROR_MONITORING',
        resourceId: alertId,
        success: true,
        ip: null,
        userAgent: null,
        metadata: {
          status: status
        }
      });

      return true;
    } catch (error) {
      throw error;
    }
  },

  generateErrorReport: async () => {
    try {
      const report = {
        timestamp: new Date(),
        statistics: await this.getErrorStatistics(),
        recentErrors: await this.getErrorLogs({ limit: 100 }),
        activeAlerts: await this.getErrorAlerts({ status: 'ACTIVE' }),
        recommendations: this.generateErrorRecommendations()
      };

      // Save report
      await this.saveReport(report);

      return report;
    } catch (error) {
      throw error;
    }
  },

  generateErrorRecommendations: () => {
    const recommendations = [];

    // Error rate recommendations
    if (this.stats.errorRate > this.config.errorRateThreshold) {
      recommendations.push({
        priority: 'HIGH',
        description: 'High error rate detected',
        action: 'Investigate and fix error sources'
      });
    }

    // Error volume recommendations
    if (this.stats.errors > this.config.errorThreshold) {
      recommendations.push({
        priority: 'HIGH',
        description: 'High error volume detected',
        action: 'Implement error rate limiting or circuit breaker'
      });
    }

    // Error type recommendations
    const errorTypes = this.getErrorTypeDistribution();
    if (errorTypes[this.errorTypes.APPLICATION] > 0.5) {
      recommendations.push({
        priority: 'MEDIUM',
        description: 'High application error rate detected',
        action: 'Review application code and fix bugs'
      });
    }

    // Error source recommendations
    const errorSources = this.getErrorSourceDistribution();
    if (errorSources[this.errorSources.DATABASE] > 0.3) {
      recommendations.push({
        priority: 'MEDIUM',
        description: 'High database error rate detected',
        action: 'Optimize database queries or increase resources'
      });
    }

    return recommendations;
  },

  getErrorTypeDistribution: async () => {
    try {
      const distribution = {};
      const errors = await this.getErrorLogs({ limit: 1000 });

      errors.forEach(error => {
        distribution[error.type] = (distribution[error.type] || 0) + 1;
      });

      const total = Object.values(distribution).reduce((a, b) => a + b, 0);
      return Object.entries(distribution).reduce((acc, [type, count]) => ({
        ...acc,
        [type]: count / total
      }), {});
    } catch (error) {
      throw error;
    }
  },

  getErrorSourceDistribution: async () => {
    try {
      const distribution = {};
      const errors = await this.getErrorLogs({ limit: 1000 });

      errors.forEach(error => {
        distribution[error.source] = (distribution[error.source] || 0) + 1;
      });

      const total = Object.values(distribution).reduce((a, b) => a + b, 0);
      return Object.entries(distribution).reduce((acc, [source, count]) => ({
        ...acc,
        [source]: count / total
      }), {});
    } catch (error) {
      throw error;
    }
  },

  saveReport: async (report) => {
    try {
      // Create report directory
      const reportDir = path.join(__dirname, '../../error-reports');
      await fs.mkdir(reportDir, { recursive: true });

      // Create report file
      const reportFile = path.join(
        reportDir,
        `error-report-${new Date(report.timestamp).toISOString().split('T')[0]}.json`
      );

      // Save report
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      // Save to database
      await User.createErrorReport({
        id: crypto.randomUUID(),
        timestamp: report.timestamp,
        statistics: report.statistics,
        recentErrors: report.recentErrors,
        activeAlerts: report.activeAlerts,
        recommendations: report.recommendations
      });

      // Rotate reports if needed
      await this.rotateReports();
    } catch (error) {
      throw error;
    }
  },

  rotateReports: async () => {
    try {
      const reportDir = path.join(__dirname, '../../error-reports');
      const files = await fs.readdir(reportDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.maxErrorRetention);

      for (const file of files) {
        const filePath = path.join(reportDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.birthtime < cutoffDate) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      throw error;
    }
  },

  updateErrorStatistics: () => {
    this.stats.errors++;
    this.stats.lastErrorTime = Date.now();
    this.stats.errorRate = this.stats.errors / (Date.now() - this.stats.lastErrorTime);
  }
};

module.exports = errorLoggingService;
