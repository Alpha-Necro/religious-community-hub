const { i18nService } = require('./i18nService');
const { securityAuditService } = require('./securityAuditService');
const { Op } = require('sequelize');
const User = require('../models/User');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const localeDetectionService = {
  detectionSources: {
    QUERY: 'QUERY',
    COOKIE: 'COOKIE',
    HEADER: 'HEADER',
    SESSION: 'SESSION',
    BROWSER: 'BROWSER',
    NATIVE: 'NATIVE'
  },

  detectionOrder: [
    'QUERY',
    'COOKIE',
    'HEADER',
    'SESSION',
    'BROWSER',
    'NATIVE'
  ],

  detectionStatus: {
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    UNKNOWN: 'UNKNOWN'
  },

  initialize: async () => {
    try {
      // Initialize detection configuration
      this.config = {
        sources: this.detectionSources,
        order: this.detectionOrder,
        fallback: i18nService.defaultLocale,
        storage: {
          type: 'cookie',
          name: 'locale',
          maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
        },
        validation: {
          required: true,
          minLength: 2,
          maxLength: 5,
          allowedChars: /^[a-zA-Z]{2}-[a-zA-Z]{2}$/
        },
        native: {
          languages: {
            'hi-IN': {
              script: 'Devanagari',
              direction: 'ltr',
              fallback: 'en-US'
            },
            'ber-MA': {
              script: 'Tifinagh',
              direction: 'rtl',
              fallback: 'ar-SA'
            }
          }
        }
      };

      // Initialize detection middleware
      this.detectionMiddleware = (req, res, next) => {
        try {
          // Get locale from query
          const queryLocale = req.query.locale;
          if (queryLocale && this.validateLocale(queryLocale)) {
            req.locale = queryLocale;
            return next();
          }

          // Get locale from cookie
          const cookieLocale = req.cookies.locale;
          if (cookieLocale && this.validateLocale(cookieLocale)) {
            req.locale = cookieLocale;
            return next();
          }

          // Get locale from header
          const headerLocale = req.headers['accept-language'];
          if (headerLocale) {
            const locales = headerLocale.split(',');
            for (const locale of locales) {
              const [code, quality] = locale.split(';');
              if (this.validateLocale(code.trim())) {
                req.locale = code.trim();
                return next();
              }
            }
          }

          // Get locale from session
          const sessionLocale = req.session.locale;
          if (sessionLocale && this.validateLocale(sessionLocale)) {
            req.locale = sessionLocale;
            return next();
          }

          // Get locale from browser
          const browserLocale = navigator.language || navigator.userLanguage;
          if (browserLocale) {
            const locales = browserLocale.split(',');
            for (const locale of locales) {
              const [code, quality] = locale.split(';');
              if (this.validateLocale(code.trim())) {
                req.locale = code.trim();
                return next();
              }
            }
          }

          // Get locale from native
          const nativeLocale = this.getNativeLocale();
          if (nativeLocale) {
            req.locale = nativeLocale;
            return next();
          }

          // Fallback to default locale
          req.locale = this.config.fallback;
          next();
        } catch (error) {
          req.locale = this.config.fallback;
          next();
        }
      };

      // Initialize detection monitoring
      this.monitoringInterval = setInterval(() => {
        this.monitorDetection();
      }, 60000); // 1 minute

      return true;
    } catch (error) {
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'LOCALE_DETECTION_INITIALIZATION_FAILED',
        resource: 'LOCALE_DETECTION',
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

  validateLocale: (locale) => {
    try {
      // Check required
      if (!locale) {
        return false;
      }

      // Check min length
      if (locale.length < this.config.validation.minLength) {
        return false;
      }

      // Check max length
      if (locale.length > this.config.validation.maxLength) {
        return false;
      }

      // Check allowed chars
      if (!this.config.validation.allowedChars.test(locale)) {
        return false;
      }

      // Check supported locales
      if (!i18nService.supportedLocales.includes(locale)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  detectLocale: async (req, res) => {
    try {
      // Get locale from query
      const queryLocale = req.query.locale;
      if (queryLocale && this.validateLocale(queryLocale)) {
        return queryLocale;
      }

      // Get locale from cookie
      const cookieLocale = req.cookies.locale;
      if (cookieLocale && this.validateLocale(cookieLocale)) {
        return cookieLocale;
      }

      // Get locale from header
      const headerLocale = req.headers['accept-language'];
      if (headerLocale) {
        const locales = headerLocale.split(',');
        for (const locale of locales) {
          const [code, quality] = locale.split(';');
          if (this.validateLocale(code.trim())) {
            return code.trim();
          }
        }
      }

      // Get locale from session
      const sessionLocale = req.session.locale;
      if (sessionLocale && this.validateLocale(sessionLocale)) {
        return sessionLocale;
      }

      // Get locale from browser
      const browserLocale = navigator.language || navigator.userLanguage;
      if (browserLocale) {
        const locales = browserLocale.split(',');
        for (const locale of locales) {
          const [code, quality] = locale.split(';');
          if (this.validateLocale(code.trim())) {
            return code.trim();
          }
        }
      }

      // Get locale from native
      const nativeLocale = this.getNativeLocale();
      if (nativeLocale) {
        return nativeLocale;
      }

      // Fallback to default locale
      return this.config.fallback;
    } catch (error) {
      return this.config.fallback;
    }
  },

  setLocale: async (req, res, locale) => {
    try {
      // Validate locale
      if (!this.validateLocale(locale)) {
        throw new Error(`Unsupported locale: ${locale}`);
      }

      // Set locale in query
      req.query.locale = locale;

      // Set locale in cookie
      res.cookie('locale', locale, {
        maxAge: this.config.storage.maxAge,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      // Set locale in header
      res.setHeader('Content-Language', locale);

      // Set locale in session
      req.session.locale = locale;

      // Set locale in browser
      navigator.language = locale;

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: req.user?.id,
        action: 'LOCALE_SET',
        resource: 'LOCALE_DETECTION',
        resourceId: locale,
        success: true,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          locale
        }
      });

      return locale;
    } catch (error) {
      throw error;
    }
  },

  getLocale: async (req) => {
    try {
      // Get locale from query
      const queryLocale = req.query.locale;
      if (queryLocale && this.validateLocale(queryLocale)) {
        return queryLocale;
      }

      // Get locale from cookie
      const cookieLocale = req.cookies.locale;
      if (cookieLocale && this.validateLocale(cookieLocale)) {
        return cookieLocale;
      }

      // Get locale from header
      const headerLocale = req.headers['accept-language'];
      if (headerLocale) {
        const locales = headerLocale.split(',');
        for (const locale of locales) {
          const [code, quality] = locale.split(';');
          if (this.validateLocale(code.trim())) {
            return code.trim();
          }
        }
      }

      // Get locale from session
      const sessionLocale = req.session.locale;
      if (sessionLocale && this.validateLocale(sessionLocale)) {
        return sessionLocale;
      }

      // Get locale from browser
      const browserLocale = navigator.language || navigator.userLanguage;
      if (browserLocale) {
        const locales = browserLocale.split(',');
        for (const locale of locales) {
          const [code, quality] = locale.split(';');
          if (this.validateLocale(code.trim())) {
            return code.trim();
          }
        }
      }

      // Get locale from native
      const nativeLocale = this.getNativeLocale();
      if (nativeLocale) {
        return nativeLocale;
      }

      // Fallback to default locale
      return this.config.fallback;
    } catch (error) {
      return this.config.fallback;
    }
  },

  getNativeLocale: () => {
    try {
      // Get native locale from config
      const nativeLocale = this.config.native.languages[Object.keys(this.config.native.languages)[0]];
      if (nativeLocale) {
        return nativeLocale.fallback;
      }

      return null;
    } catch (error) {
      return null;
    }
  },

  monitorDetection: async () => {
    try {
      // Get detection statistics
      const stats = await this.getDetectionStatistics();

      // Check error rate
      if (stats.errorRate > 0.01) {
        await this.createDetectionAlert({
          title: 'High Detection Error Rate',
          description: `Detection error rate above threshold: ${stats.errorRate.toFixed(2)}%`,
          severity: 'CRITICAL',
          type: 'DETECTION_ERROR_RATE_HIGH',
          metadata: {
            errorRate: stats.errorRate,
            threshold: 0.01
          }
        });
      }

      // Check detection failures
      if (stats.failures > 100) {
        await this.createDetectionAlert({
          title: 'High Detection Failures',
          description: `High number of detection failures: ${stats.failures}`,
          severity: 'WARNING',
          type: 'DETECTION_FAILURES_HIGH',
          metadata: {
            failures: stats.failures
          }
        });
      }

      return true;
    } catch (error) {
      throw error;
    }
  },

  getDetectionStatistics: async () => {
    try {
      // Get detection statistics
      const stats = await User.getDetectionStatistics();

      // Calculate error rate
      const errorRate = stats.failures / stats.total;

      return {
        total: stats.total,
        success: stats.success,
        failures: stats.failures,
        errorRate
      };
    } catch (error) {
      throw error;
    }
  },

  createDetectionAlert: async (alert) => {
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
      await User.createDetectionAlert(alertData);

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'DETECTION_ALERT_CREATED',
        resource: 'LOCALE_DETECTION',
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

  getDetectionAlerts: async (options = {}) => {
    try {
      const alerts = await User.getDetectionAlerts({
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

  updateDetectionAlert: async (alertId, status) => {
    try {
      // Update alert status
      await User.updateDetectionAlert(alertId, status);

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'DETECTION_ALERT_UPDATED',
        resource: 'LOCALE_DETECTION',
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

  generateDetectionReport: async () => {
    try {
      const report = {
        timestamp: new Date(),
        statistics: await this.getDetectionStatistics(),
        recentDetections: await this.getRecentDetections(),
        activeAlerts: await this.getDetectionAlerts({ status: 'ACTIVE' }),
        recommendations: this.generateDetectionRecommendations()
      };

      // Save report
      await this.saveReport(report);

      return report;
    } catch (error) {
      throw error;
    }
  },

  getRecentDetections: async () => {
    try {
      return await User.getRecentDetections(100);
    } catch (error) {
      throw error;
    }
  },

  generateDetectionRecommendations: () => {
    const recommendations = [];

    // Error rate recommendations
    if (this.stats.errorRate > 0.01) {
      recommendations.push({
        priority: 'HIGH',
        description: 'High detection error rate detected',
        action: 'Investigate and fix detection failures'
      });
    }

    // Detection failures recommendations
    if (this.stats.failures > 100) {
      recommendations.push({
        priority: 'MEDIUM',
        description: 'High number of detection failures detected',
        action: 'Review and fix detection failures'
      });
    }

    // Detection sources recommendations
    if (this.stats.sources.length < 3) {
      recommendations.push({
        priority: 'LOW',
        description: 'Low number of detection sources detected',
        action: 'Add more detection sources'
      });
    }

    return recommendations;
  },

  saveReport: async (report) => {
    try {
      // Create report directory
      const reportDir = path.join(__dirname, '../../detection-reports');
      await fs.mkdir(reportDir, { recursive: true });

      // Create report file
      const reportFile = path.join(
        reportDir,
        `detection-report-${new Date(report.timestamp).toISOString().split('T')[0]}.json`
      );

      // Save report
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      // Save to database
      await User.createDetectionReport({
        id: crypto.randomUUID(),
        timestamp: report.timestamp,
        statistics: report.statistics,
        recentDetections: report.recentDetections,
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
      const reportDir = path.join(__dirname, '../../detection-reports');
      const files = await fs.readdir(reportDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days

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

  getDetectionMiddleware: () => this.detectionMiddleware
};

module.exports = localeDetectionService;
