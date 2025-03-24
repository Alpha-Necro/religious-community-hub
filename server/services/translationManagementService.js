const { i18nService } = require('./i18nService');
const { securityAuditService } = require('./securityAuditService');
const { Op } = require('sequelize');
const User = require('../models/User');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const translationManagementService = {
  translationStatus: {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
  },

  translationTypes: {
    MANUAL: 'MANUAL',
    AUTOMATIC: 'AUTOMATIC',
    HYBRID: 'HYBRID'
  },

  translationSources: {
    DATABASE: 'DATABASE',
    FILE: 'FILE',
    API: 'API',
    UI: 'UI',
    NATIVE: 'NATIVE'
  },

  initialize: async () => {
    try {
      // Initialize translation configuration
      this.config = {
        providers: {
          google: {
            enabled: process.env.GOOGLE_TRANSLATE_API_KEY ? true : false,
            apiKey: process.env.GOOGLE_TRANSLATE_API_KEY
          },
          microsoft: {
            enabled: process.env.MICROSOFT_TRANSLATE_API_KEY ? true : false,
            apiKey: process.env.MICROSOFT_TRANSLATE_API_KEY
          },
          aws: {
            enabled: process.env.AWS_TRANSLATE_API_KEY ? true : false,
            apiKey: process.env.AWS_TRANSLATE_API_KEY
          },
          native: {
            enabled: true,
            languages: {
              'hi-IN': {
                enabled: true,
                provider: 'google',
                fallback: 'en-US'
              },
              'ber-MA': {
                enabled: true,
                provider: 'microsoft',
                fallback: 'ar-SA'
              }
            }
          }
        },
        storage: {
          type: 'database',
          model: User,
          table: 'translations'
        },
        validation: {
          required: true,
          minLength: 1,
          maxLength: 1000,
          allowedChars: /^[\w\s\p{P}\p{S}]+$/u
        },
        monitoring: {
          enabled: true,
          interval: 60000, // 1 minute
          threshold: 0.01
        }
      };

      // Initialize translation providers
      await this.initializeTranslationProviders();

      // Initialize translation monitoring
      this.monitoringInterval = setInterval(() => {
        this.monitorTranslations();
      }, this.config.monitoring.interval);

      return true;
    } catch (error) {
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'TRANSLATION_MANAGEMENT_INITIALIZATION_FAILED',
        resource: 'TRANSLATION_MANAGEMENT',
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

  initializeTranslationProviders: async () => {
    try {
      // Initialize Google Translate
      if (this.config.providers.google.enabled) {
        const { Translate } = require('@google-cloud/translate').v2;
        this.googleTranslate = new Translate({
          projectId: process.env.GOOGLE_PROJECT_ID,
          keyFilename: process.env.GOOGLE_CREDENTIALS_FILE
        });
      }

      // Initialize Microsoft Translator
      if (this.config.providers.microsoft.enabled) {
        const { Translator } = require('@microsoft/translator');
        this.microsoftTranslator = new Translator({
          apiKey: this.config.providers.microsoft.apiKey
        });
      }

      // Initialize AWS Translate
      if (this.config.providers.aws.enabled) {
        const { TranslateClient } = require('@aws-sdk/client-translate');
        this.awsTranslate = new TranslateClient({
          region: process.env.AWS_REGION
        });
      }

      return true;
    } catch (error) {
      throw error;
    }
  },

  createTranslation: async (text, source, target, options = {}) => {
    try {
      // Create translation ID
      const translationId = crypto.randomUUID();

      // Create translation context
      const context = {
        id: translationId,
        text,
        source,
        target,
        type: options.type || this.translationTypes.AUTOMATIC,
        sourceType: options.sourceType || this.translationSources.UI,
        status: this.translationStatus.PENDING,
        timestamp: new Date(),
        metadata: options.metadata || {}
      };

      // Save to database
      await User.createTranslation(context);

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: options.userId,
        action: 'TRANSLATION_CREATED',
        resource: 'TRANSLATION_MANAGEMENT',
        resourceId: translationId,
        success: true,
        ip: options.ip,
        userAgent: options.userAgent,
        metadata: {
          translation: context
        }
      });

      return translationId;
    } catch (error) {
      throw error;
    }
  },

  updateTranslation: async (translationId, text, target, options = {}) => {
    try {
      // Update translation
      await User.updateTranslation(translationId, {
        text,
        target,
        status: this.translationStatus.IN_PROGRESS,
        timestamp: new Date(),
        metadata: options.metadata || {}
      });

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: options.userId,
        action: 'TRANSLATION_UPDATED',
        resource: 'TRANSLATION_MANAGEMENT',
        resourceId: translationId,
        success: true,
        ip: options.ip,
        userAgent: options.userAgent,
        metadata: {
          translationId,
          text,
          target
        }
      });

      return true;
    } catch (error) {
      throw error;
    }
  },

  approveTranslation: async (translationId, options = {}) => {
    try {
      // Approve translation
      await User.approveTranslation(translationId, {
        status: this.translationStatus.COMPLETED,
        timestamp: new Date(),
        metadata: options.metadata || {}
      });

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: options.userId,
        action: 'TRANSLATION_APPROVED',
        resource: 'TRANSLATION_MANAGEMENT',
        resourceId: translationId,
        success: true,
        ip: options.ip,
        userAgent: options.userAgent,
        metadata: {
          translationId
        }
      });

      return true;
    } catch (error) {
      throw error;
    }
  },

  rejectTranslation: async (translationId, reason, options = {}) => {
    try {
      // Reject translation
      await User.rejectTranslation(translationId, {
        status: this.translationStatus.FAILED,
        reason,
        timestamp: new Date(),
        metadata: options.metadata || {}
      });

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: options.userId,
        action: 'TRANSLATION_REJECTED',
        resource: 'TRANSLATION_MANAGEMENT',
        resourceId: translationId,
        success: true,
        ip: options.ip,
        userAgent: options.userAgent,
        metadata: {
          translationId,
          reason
        }
      });

      return true;
    } catch (error) {
      throw error;
    }
  },

  getTranslation: async (text, source, target, options = {}) => {
    try {
      // Get translation from database
      const translation = await User.getTranslation(text, source, target);
      if (translation) {
        return translation;
      }

      // Get translation from providers
      return await this.translateWithProviders(text, source, target, options);
    } catch (error) {
      throw error;
    }
  },

  translateWithProviders: async (text, source, target, options = {}) => {
    try {
      // Get translation providers
      const providers = [];
      if (this.config.providers.google.enabled) {
        providers.push('google');
      }
      if (this.config.providers.microsoft.enabled) {
        providers.push('microsoft');
      }
      if (this.config.providers.aws.enabled) {
        providers.push('aws');
      }

      // Get translations from providers
      const translations = await Promise.all(
        providers.map(async (provider) => {
          try {
            switch (provider) {
              case 'google':
                return await this.translateWithGoogle(text, source, target);
              case 'microsoft':
                return await this.translateWithMicrosoft(text, source, target);
              case 'aws':
                return await this.translateWithAWS(text, source, target);
              default:
                throw new Error(`Unknown provider: ${provider}`);
            }
          } catch (error) {
            return null;
          }
        })
      );

      // Get best translation
      const bestTranslation = translations.find(t => t !== null);
      if (!bestTranslation) {
        throw new Error('No translation available');
      }

      // Validate translation
      if (!this.validateTranslation(bestTranslation)) {
        throw new Error('Invalid translation');
      }

      // Save translation
      await this.saveTranslation(text, bestTranslation, source, target, options);

      return bestTranslation;
    } catch (error) {
      throw error;
    }
  },

  translateWithGoogle: async (text, source, target) => {
    try {
      const [translation] = await this.googleTranslate.translate(text, source, target);
      return translation;
    } catch (error) {
      throw error;
    }
  },

  translateWithMicrosoft: async (text, source, target) => {
    try {
      const translation = await this.microsoftTranslator.translate(text, source, target);
      return translation;
    } catch (error) {
      throw error;
    }
  },

  translateWithAWS: async (text, source, target) => {
    try {
      const command = new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: source,
        TargetLanguageCode: target
      });
      const response = await this.awsTranslate.send(command);
      return response.TranslatedText;
    } catch (error) {
      throw error;
    }
  },

  validateTranslation: (translation) => {
    try {
      // Check required
      if (!translation) {
        return false;
      }

      // Check min length
      if (translation.length < this.config.validation.minLength) {
        return false;
      }

      // Check max length
      if (translation.length > this.config.validation.maxLength) {
        return false;
      }

      // Check allowed chars
      if (!this.config.validation.allowedChars.test(translation)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  saveTranslation: async (text, translation, source, target, options = {}) => {
    try {
      // Create translation ID
      const translationId = crypto.randomUUID();

      // Create translation context
      const context = {
        id: translationId,
        text,
        translation,
        source,
        target,
        status: this.translationStatus.COMPLETED,
        timestamp: new Date(),
        metadata: options.metadata || {}
      };

      // Save to database
      await User.createTranslation(context);

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: options.userId,
        action: 'TRANSLATION_SAVED',
        resource: 'TRANSLATION_MANAGEMENT',
        resourceId: translationId,
        success: true,
        ip: options.ip,
        userAgent: options.userAgent,
        metadata: {
          translation: context
        }
      });

      return translationId;
    } catch (error) {
      throw error;
    }
  },

  monitorTranslations: async () => {
    try {
      // Get pending translations
      const pendingTranslations = await User.getPendingTranslations();

      // Process pending translations
      for (const translation of pendingTranslations) {
        try {
          // Get translation
          const translatedText = await this.getTranslation(
            translation.text,
            translation.source,
            translation.target
          );

          // Update translation
          await this.updateTranslation(
            translation.id,
            translatedText,
            translation.target
          );

          // Approve translation
          await this.approveTranslation(translation.id);
        } catch (error) {
          // Reject translation
          await this.rejectTranslation(
            translation.id,
            error.message
          );
        }
      }

      // Get failed translations
      const failedTranslations = await User.getFailedTranslations();

      // Process failed translations
      for (const translation of failedTranslations) {
        try {
          // Get translation
          const translatedText = await this.getTranslation(
            translation.text,
            translation.source,
            translation.target
          );

          // Update translation
          await this.updateTranslation(
            translation.id,
            translatedText,
            translation.target
          );

          // Approve translation
          await this.approveTranslation(translation.id);
        } catch (error) {
          // Log error
          await securityAuditService.createAuditLog({
            userId: null,
            action: 'TRANSLATION_MONITORING_FAILED',
            resource: 'TRANSLATION_MANAGEMENT',
            resourceId: translation.id,
            success: false,
            ip: null,
            userAgent: null,
            metadata: {
              error: error.message
            }
          });
        }
      }

      // Get translation statistics
      const stats = await this.getTranslationStatistics();

      // Check error rate
      if (stats.errorRate > this.config.monitoring.threshold) {
        await this.createTranslationAlert({
          title: 'High Translation Error Rate',
          description: `Translation error rate above threshold: ${stats.errorRate.toFixed(2)}%`,
          severity: 'CRITICAL',
          type: 'TRANSLATION_ERROR_RATE_HIGH',
          metadata: {
            errorRate: stats.errorRate,
            threshold: this.config.monitoring.threshold
          }
        });
      }

      return true;
    } catch (error) {
      throw error;
    }
  },

  getTranslationStatistics: async () => {
    try {
      // Get translation statistics
      const stats = await User.getTranslationStatistics();

      // Calculate error rate
      const errorRate = stats.failed / stats.total;

      return {
        total: stats.total,
        pending: stats.pending,
        inProgress: stats.inProgress,
        completed: stats.completed,
        failed: stats.failed,
        errorRate
      };
    } catch (error) {
      throw error;
    }
  },

  createTranslationAlert: async (alert) => {
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
      await User.createTranslationAlert(alertData);

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'TRANSLATION_ALERT_CREATED',
        resource: 'TRANSLATION_MANAGEMENT',
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

  getTranslationAlerts: async (options = {}) => {
    try {
      const alerts = await User.getTranslationAlerts({
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

  updateTranslationAlert: async (alertId, status) => {
    try {
      // Update alert status
      await User.updateTranslationAlert(alertId, status);

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'TRANSLATION_ALERT_UPDATED',
        resource: 'TRANSLATION_MANAGEMENT',
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

  generateTranslationReport: async () => {
    try {
      const report = {
        timestamp: new Date(),
        statistics: await this.getTranslationStatistics(),
        recentTranslations: await this.getRecentTranslations(),
        activeAlerts: await this.getTranslationAlerts({ status: 'ACTIVE' }),
        recommendations: this.generateTranslationRecommendations()
      };

      // Save report
      await this.saveReport(report);

      return report;
    } catch (error) {
      throw error;
    }
  },

  getRecentTranslations: async () => {
    try {
      return await User.getRecentTranslations(100);
    } catch (error) {
      throw error;
    }
  },

  generateTranslationRecommendations: () => {
    const recommendations = [];

    // Error rate recommendations
    if (this.stats.errorRate > this.config.monitoring.threshold) {
      recommendations.push({
        priority: 'HIGH',
        description: 'High translation error rate detected',
        action: 'Investigate and fix translation failures'
      });
    }

    // Pending translations recommendations
    if (this.stats.pending > 100) {
      recommendations.push({
        priority: 'MEDIUM',
        description: 'High number of pending translations detected',
        action: 'Process pending translations'
      });
    }

    // Failed translations recommendations
    if (this.stats.failed > 50) {
      recommendations.push({
        priority: 'MEDIUM',
        description: 'High number of failed translations detected',
        action: 'Review and fix failed translations'
      });
    }

    return recommendations;
  },

  saveReport: async (report) => {
    try {
      // Create report directory
      const reportDir = path.join(__dirname, '../../translation-reports');
      await fs.mkdir(reportDir, { recursive: true });

      // Create report file
      const reportFile = path.join(
        reportDir,
        `translation-report-${new Date(report.timestamp).toISOString().split('T')[0]}.json`
      );

      // Save report
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      // Save to database
      await User.createTranslationReport({
        id: crypto.randomUUID(),
        timestamp: report.timestamp,
        statistics: report.statistics,
        recentTranslations: report.recentTranslations,
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
      const reportDir = path.join(__dirname, '../../translation-reports');
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
  }
};

module.exports = translationManagementService;
