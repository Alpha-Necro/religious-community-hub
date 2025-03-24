const { errorLoggingService } = require('./errorLoggingService');
const { securityAuditService } = require('./securityAuditService');
const { Op } = require('sequelize');
const User = require('../models/User');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const errorMonitoringService = {
  monitoringTypes: {
    REAL_TIME: 'REAL_TIME',
    HISTORICAL: 'HISTORICAL',
    PREDICTIVE: 'PREDICTIVE'
  },

  monitoringIntervals: {
    REAL_TIME: 1000, // 1 second
    HISTORICAL: 60000, // 1 minute
    PREDICTIVE: 3600000 // 1 hour
  },

  monitoringStatus: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    PAUSED: 'PAUSED',
    ERROR: 'ERROR'
  },

  initialize: async () => {
    try {
      // Initialize monitoring configuration
      this.config = {
        thresholds: {
          errorRate: process.env.ERROR_RATE_THRESHOLD || 0.01,
          errorVolume: process.env.ERROR_VOLUME_THRESHOLD || 100,
          errorWindow: process.env.ERROR_WINDOW || 60000, // 1 minute
          anomalyThreshold: process.env.ANOMALY_THRESHOLD || 3
        },
        monitoringIntervals: {
          realTime: this.monitoringIntervals.REAL_TIME,
          historical: this.monitoringIntervals.HISTORICAL,
          predictive: this.monitoringIntervals.PREDICTIVE
        },
        maxAlerts: process.env.MAX_ALERTS || 100,
        alertRetention: process.env.ALERT_RETENTION || 30 // days
      };

      // Initialize monitoring intervals
      this.intervals = {
        realTime: setInterval(() => {
          this.monitorRealTimeErrors();
        }, this.config.monitoringIntervals.realTime),

        historical: setInterval(() => {
          this.monitorHistoricalErrors();
        }, this.config.monitoringIntervals.historical),

        predictive: setInterval(() => {
          this.monitorPredictiveErrors();
        }, this.config.monitoringIntervals.predictive)
      };

      // Initialize error statistics
      this.stats = {
        currentErrors: 0,
        errorRate: 0,
        anomalyScore: 0,
        lastErrorTime: 0,
        errorWindow: this.config.errorWindow
      };

      // Initialize alert statistics
      this.alertStats = {
        currentAlerts: 0,
        activeAlerts: 0,
        resolvedAlerts: 0,
        suppressedAlerts: 0
      };

      // Initialize monitoring status
      this.status = {
        realTime: this.monitoringStatus.ACTIVE,
        historical: this.monitoringStatus.ACTIVE,
        predictive: this.monitoringStatus.ACTIVE
      };

      return true;
    } catch (error) {
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'ERROR_MONITORING_INITIALIZATION_FAILED',
        resource: 'ERROR_MONITORING',
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

  monitorRealTimeErrors: async () => {
    try {
      // Get current error statistics
      const stats = await errorLoggingService.getErrorStatistics();

      // Check error rate threshold
      if (stats.errorRate > this.config.thresholds.errorRate) {
        await this.createAlert({
          title: 'High Error Rate Detected',
          description: `Error rate above threshold: ${stats.errorRate.toFixed(2)}%`,
          severity: 'CRITICAL',
          type: 'ERROR_RATE_HIGH',
          metadata: {
            errorRate: stats.errorRate,
            threshold: this.config.thresholds.errorRate
          }
        });
      }

      // Check error volume threshold
      if (stats.errors > this.config.thresholds.errorVolume) {
        await this.createAlert({
          title: 'High Error Volume Detected',
          description: `Error volume above threshold: ${stats.errors} errors`,
          severity: 'CRITICAL',
          type: 'ERROR_VOLUME_HIGH',
          metadata: {
            errors: stats.errors,
            threshold: this.config.thresholds.errorVolume
          }
        });
      }

      // Update error statistics
      this.stats = {
        currentErrors: stats.errors,
        errorRate: stats.errorRate,
        anomalyScore: this.calculateAnomalyScore(stats),
        lastErrorTime: stats.lastErrorTime,
        errorWindow: this.config.errorWindow
      };

      // Update monitoring status
      this.status.realTime = this.monitoringStatus.ACTIVE;
    } catch (error) {
      this.status.realTime = this.monitoringStatus.ERROR;
      throw error;
    }
  },

  monitorHistoricalErrors: async () => {
    try {
      // Get historical error statistics
      const stats = await errorLoggingService.getErrorStatistics(this.config.errorWindow);

      // Calculate error trends
      const trends = this.calculateErrorTrends(stats);

      // Check for error spikes
      if (trends.spike) {
        await this.createAlert({
          title: 'Error Spike Detected',
          description: `Error rate increased by ${trends.spikeRate.toFixed(2)}%`,
          severity: 'CRITICAL',
          type: 'ERROR_SPIKE',
          metadata: {
            spikeRate: trends.spikeRate,
            currentRate: stats.errorRate,
            previousRate: trends.previousRate
          }
        });
      }

      // Check for error patterns
      const patterns = this.detectErrorPatterns(stats);
      if (patterns.length > 0) {
        await this.createAlert({
          title: 'Error Pattern Detected',
          description: `Detected error pattern: ${patterns.join(', ')}`,
          severity: 'WARNING',
          type: 'ERROR_PATTERN',
          metadata: {
            patterns
          }
        });
      }

      // Update error statistics
      this.stats = {
        currentErrors: stats.errors,
        errorRate: stats.errorRate,
        anomalyScore: this.calculateAnomalyScore(stats),
        lastErrorTime: stats.lastErrorTime,
        errorWindow: this.config.errorWindow
      };

      // Update monitoring status
      this.status.historical = this.monitoringStatus.ACTIVE;
    } catch (error) {
      this.status.historical = this.monitoringStatus.ERROR;
      throw error;
    }
  },

  monitorPredictiveErrors: async () => {
    try {
      // Get historical error data
      const historicalData = await errorLoggingService.getErrorLogs({
        limit: 1000,
        startTime: new Date(Date.now() - 86400000) // 24 hours
      });

      // Analyze error patterns
      const patterns = this.analyzeErrorPatterns(historicalData);

      // Predict future errors
      const predictions = this.predictFutureErrors(patterns);

      // Create predictive alerts
      if (predictions.length > 0) {
        await this.createAlert({
          title: 'Predicted Error Condition',
          description: `Predicted error condition: ${predictions.join(', ')}`,
          severity: 'WARNING',
          type: 'ERROR_PREDICTION',
          metadata: {
            predictions
          }
        });
      }

      // Update monitoring status
      this.status.predictive = this.monitoringStatus.ACTIVE;
    } catch (error) {
      this.status.predictive = this.monitoringStatus.ERROR;
      throw error;
    }
  },

  createAlert: async (alert) => {
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

      // Update alert statistics
      this.alertStats.currentAlerts++;
      this.alertStats.activeAlerts++;

      return alertId;
    } catch (error) {
      throw error;
    }
  },

  calculateAnomalyScore: (stats) => {
    const baseline = this.getBaselineErrorRate();
    const deviation = Math.abs(stats.errorRate - baseline);
    return deviation / baseline;
  },

  calculateErrorTrends: (stats) => {
    const previousStats = this.getPreviousErrorStatistics();
    const spikeRate = (stats.errorRate - previousStats.errorRate) / previousStats.errorRate;
    return {
      spike: spikeRate > this.config.thresholds.anomalyThreshold,
      spikeRate,
      previousRate: previousStats.errorRate
    };
  },

  detectErrorPatterns: (stats) => {
    const patterns = [];
    const errorTypes = this.getErrorTypeDistribution();
    const errorSources = this.getErrorSourceDistribution();

    // Check for type patterns
    Object.entries(errorTypes).forEach(([type, rate]) => {
      if (rate > 0.5) {
        patterns.push(`High ${type} error rate: ${rate.toFixed(2)}%`);
      }
    });

    // Check for source patterns
    Object.entries(errorSources).forEach(([source, rate]) => {
      if (rate > 0.3) {
        patterns.push(`High ${source} error rate: ${rate.toFixed(2)}%`);
      }
    });

    return patterns;
  },

  analyzeErrorPatterns: (historicalData) => {
    const patterns = {};
    historicalData.forEach(error => {
      const key = `${error.type}:${error.source}:${error.code}`;
      patterns[key] = (patterns[key] || 0) + 1;
    });

    return Object.entries(patterns)
      .filter(([_, count]) => count > 5)
      .map(([key, count]) => ({
        pattern: key,
        count,
        rate: count / historicalData.length
      }));
  },

  predictFutureErrors: (patterns) => {
    const predictions = [];
    patterns.forEach(pattern => {
      if (pattern.rate > 0.1) {
        predictions.push(`High likelihood of ${pattern.pattern} errors`);
      }
    });
    return predictions;
  },

  getBaselineErrorRate: () => {
    // Get historical error rates
    const historicalRates = this.getHistoricalErrorRates();
    // Calculate moving average
    const sum = historicalRates.reduce((a, b) => a + b, 0);
    return sum / historicalRates.length;
  },

  getPreviousErrorStatistics: () => {
    // Get previous error statistics
    const previousStats = this.getHistoricalErrorStatistics();
    return previousStats[previousStats.length - 1];
  },

  getErrorTypeDistribution: async () => {
    try {
      const distribution = {};
      const errors = await errorLoggingService.getErrorLogs({ limit: 1000 });

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
      const errors = await errorLoggingService.getErrorLogs({ limit: 1000 });

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

  getHistoricalErrorRates: async () => {
    try {
      const timeWindows = 24; // 24 hours
      const windowSize = 3600000; // 1 hour
      const rates = [];

      for (let i = 0; i < timeWindows; i++) {
        const startTime = new Date(Date.now() - (i + 1) * windowSize);
        const endTime = new Date(Date.now() - i * windowSize);
        const stats = await errorLoggingService.getErrorStatistics(windowSize, startTime, endTime);
        rates.push(stats.errorRate);
      }

      return rates;
    } catch (error) {
      throw error;
    }
  },

  getHistoricalErrorStatistics: async () => {
    try {
      const timeWindows = 24; // 24 hours
      const windowSize = 3600000; // 1 hour
      const stats = [];

      for (let i = 0; i < timeWindows; i++) {
        const startTime = new Date(Date.now() - (i + 1) * windowSize);
        const endTime = new Date(Date.now() - i * windowSize);
        const statsData = await errorLoggingService.getErrorStatistics(windowSize, startTime, endTime);
        stats.push(statsData);
      }

      return stats;
    } catch (error) {
      throw error;
    }
  },

  getAlertStatistics: () => this.alertStats,

  getMonitoringStatus: () => this.status,

  getErrorStatistics: () => this.stats,

  generateMonitoringReport: async () => {
    try {
      const report = {
        timestamp: new Date(),
        statistics: {
          current: this.stats,
          historical: await this.getHistoricalErrorStatistics(),
          trends: this.calculateErrorTrends(this.stats)
        },
        monitoringStatus: this.status,
        alertStatistics: this.alertStats,
        recommendations: this.generateMonitoringRecommendations()
      };

      // Save report
      await this.saveReport(report);

      return report;
    } catch (error) {
      throw error;
    }
  },

  generateMonitoringRecommendations: () => {
    const recommendations = [];

    // Error rate recommendations
    if (this.stats.errorRate > this.config.thresholds.errorRate) {
      recommendations.push({
        priority: 'HIGH',
        description: 'High error rate detected',
        action: 'Investigate and fix error sources'
      });
    }

    // Error volume recommendations
    if (this.stats.currentErrors > this.config.thresholds.errorVolume) {
      recommendations.push({
        priority: 'HIGH',
        description: 'High error volume detected',
        action: 'Implement error rate limiting or circuit breaker'
      });
    }

    // Anomaly recommendations
    if (this.stats.anomalyScore > this.config.thresholds.anomalyThreshold) {
      recommendations.push({
        priority: 'MEDIUM',
        description: 'Anomalous error pattern detected',
        action: 'Investigate and fix error patterns'
      });
    }

    // Alert recommendations
    if (this.alertStats.activeAlerts > this.config.maxAlerts * 0.8) {
      recommendations.push({
        priority: 'MEDIUM',
        description: 'High alert volume detected',
        action: 'Review and resolve active alerts'
      });
    }

    return recommendations;
  },

  saveReport: async (report) => {
    try {
      // Create report directory
      const reportDir = path.join(__dirname, '../../error-monitoring-reports');
      await fs.mkdir(reportDir, { recursive: true });

      // Create report file
      const reportFile = path.join(
        reportDir,
        `error-monitoring-report-${new Date(report.timestamp).toISOString().split('T')[0]}.json`
      );

      // Save report
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      // Save to database
      await User.createErrorMonitoringReport({
        id: crypto.randomUUID(),
        timestamp: report.timestamp,
        statistics: report.statistics,
        monitoringStatus: report.monitoringStatus,
        alertStatistics: report.alertStatistics,
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
      const reportDir = path.join(__dirname, '../../error-monitoring-reports');
      const files = await fs.readdir(reportDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.alertRetention);

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
  }
};

module.exports = errorMonitoringService;
