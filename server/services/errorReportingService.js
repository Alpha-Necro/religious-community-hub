const { errorLoggingService } = require('./errorLoggingService');
const { securityAuditService } = require('./securityAuditService');
const { Op } = require('sequelize');
const User = require('../models/User');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
const slack = require('@slack/web-api');

const errorReportingService = {
  reportTypes: {
    EMAIL: 'EMAIL',
    SLACK: 'SLACK',
    SMS: 'SMS',
    WEBHOOK: 'WEBHOOK'
  },

  reportLevels: {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
    INFO: 'INFO'
  },

  reportStatus: {
    PENDING: 'PENDING',
    SENT: 'SENT',
    FAILED: 'FAILED'
  },

  initialize: async () => {
    try {
      // Initialize reporting configuration
      this.config = {
        email: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
          from: process.env.SMTP_FROM,
          recipients: process.env.ERROR_EMAIL_RECIPIENTS.split(',')
        },
        slack: {
          token: process.env.SLACK_TOKEN,
          channel: process.env.SLACK_CHANNEL
        },
        sms: {
          provider: process.env.SMS_PROVIDER,
          apiKey: process.env.SMS_API_KEY,
          recipients: process.env.ERROR_SMS_RECIPIENTS.split(',')
        },
        webhook: {
          url: process.env.WEBHOOK_URL,
          secret: process.env.WEBHOOK_SECRET
        },
        thresholds: {
          email: process.env.EMAIL_THRESHOLD || 10,
          slack: process.env.SLACK_THRESHOLD || 5,
          sms: process.env.SMS_THRESHOLD || 3,
          webhook: process.env.WEBHOOK_THRESHOLD || 1
        }
      };

      // Initialize transporters
      this.transporters = {
        email: nodemailer.createTransport({
          host: this.config.email.host,
          port: this.config.email.port,
          secure: true,
          auth: {
            user: this.config.email.user,
            pass: this.config.email.pass
          }
        }),
        slack: new slack.WebClient(this.config.slack.token)
      };

      // Initialize report statistics
      this.stats = {
        email: 0,
        slack: 0,
        sms: 0,
        webhook: 0,
        failures: 0
      };

      // Initialize reporting intervals
      this.intervals = {
        email: setInterval(() => {
          this.processEmailQueue();
        }, 60000), // 1 minute

        slack: setInterval(() => {
          this.processSlackQueue();
        }, 30000), // 30 seconds

        sms: setInterval(() => {
          this.processSmsQueue();
        }, 60000), // 1 minute

        webhook: setInterval(() => {
          this.processWebhookQueue();
        }, 10000) // 10 seconds
      };

      return true;
    } catch (error) {
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'ERROR_REPORTING_INITIALIZATION_FAILED',
        resource: 'ERROR_REPORTING',
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

  createReport: async (error, options = {}) => {
    try {
      // Create report ID
      const reportId = crypto.randomUUID();

      // Create report context
      const context = {
        id: reportId,
        timestamp: new Date(),
        level: options.level || this.reportLevels.CRITICAL,
        type: options.type || this.reportTypes.EMAIL,
        message: error.message,
        stack: error.stack,
        code: error.code || 'UNKNOWN_ERROR',
        details: options.details || {},
        metadata: options.metadata || {},
        userId: options.userId,
        ip: options.ip,
        userAgent: options.userAgent,
        status: this.reportStatus.PENDING
      };

      // Save to database
      await User.createErrorReport(context);

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: context.userId,
        action: 'ERROR_REPORT_CREATED',
        resource: 'ERROR_REPORTING',
        resourceId: reportId,
        success: true,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: {
          report: context
        }
      });

      // Add to appropriate queue
      this.addToQueue(context);

      return reportId;
    } catch (error) {
      throw error;
    }
  },

  addToQueue: (report) => {
    try {
      // Add to appropriate queue based on type
      switch (report.type) {
        case this.reportTypes.EMAIL:
          this.emailQueue.push(report);
          break;
        case this.reportTypes.SLACK:
          this.slackQueue.push(report);
          break;
        case this.reportTypes.SMS:
          this.smsQueue.push(report);
          break;
        case this.reportTypes.WEBHOOK:
          this.webhookQueue.push(report);
          break;
        default:
          throw new Error(`Unknown report type: ${report.type}`);
      }
    } catch (error) {
      throw error;
    }
  },

  processEmailQueue: async () => {
    try {
      // Process email queue
      const emails = this.emailQueue.filter(e => e.level >= this.reportLevels.HIGH);
      for (const email of emails) {
        await this.sendEmail(email);
      }

      // Update statistics
      this.stats.email += emails.length;
    } catch (error) {
      this.stats.failures++;
      throw error;
    }
  },

  processSlackQueue: async () => {
    try {
      // Process Slack queue
      const messages = this.slackQueue.filter(m => m.level >= this.reportLevels.MEDIUM);
      for (const message of messages) {
        await this.sendSlackMessage(message);
      }

      // Update statistics
      this.stats.slack += messages.length;
    } catch (error) {
      this.stats.failures++;
      throw error;
    }
  },

  processSmsQueue: async () => {
    try {
      // Process SMS queue
      const messages = this.smsQueue.filter(m => m.level >= this.reportLevels.CRITICAL);
      for (const message of messages) {
        await this.sendSms(message);
      }

      // Update statistics
      this.stats.sms += messages.length;
    } catch (error) {
      this.stats.failures++;
      throw error;
    }
  },

  processWebhookQueue: async () => {
    try {
      // Process webhook queue
      const webhooks = this.webhookQueue.filter(w => w.level >= this.reportLevels.LOW);
      for (const webhook of webhooks) {
        await this.sendWebhook(webhook);
      }

      // Update statistics
      this.stats.webhook += webhooks.length;
    } catch (error) {
      this.stats.failures++;
      throw error;
    }
  },

  sendEmail: async (report) => {
    try {
      // Create email content
      const mailOptions = {
        from: this.config.email.from,
        to: this.config.email.recipients.join(','),
        subject: `[${report.level}] Error Report: ${report.message}`,
        text: `
        Error Report
        ============

        Timestamp: ${report.timestamp}
        Level: ${report.level}
        Message: ${report.message}
        Stack: ${report.stack}
        Code: ${report.code}

        Details:
        ${JSON.stringify(report.details, null, 2)}

        Metadata:
        ${JSON.stringify(report.metadata, null, 2)}
        `
      };

      // Send email
      await this.transporters.email.sendMail(mailOptions);

      // Update report status
      await User.updateErrorReport(report.id, this.reportStatus.SENT);
    } catch (error) {
      await User.updateErrorReport(report.id, this.reportStatus.FAILED);
      throw error;
    }
  },

  sendSlackMessage: async (report) => {
    try {
      // Create Slack message
      const message = {
        channel: this.config.slack.channel,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Error Report: ${report.message}*`
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Level:*
                ${report.level}`
              },
              {
                type: 'mrkdwn',
                text: `*Timestamp:*
                ${report.timestamp}`
              },
              {
                type: 'mrkdwn',
                text: `*Code:*
                ${report.code}`
              },
              {
                type: 'mrkdwn',
                text: `*Details:*
                ${JSON.stringify(report.details, null, 2)}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Stack Trace:*
              ${report.stack}`
            }
          }
        ]
      };

      // Send message
      await this.transporters.slack.chat.postMessage(message);

      // Update report status
      await User.updateErrorReport(report.id, this.reportStatus.SENT);
    } catch (error) {
      await User.updateErrorReport(report.id, this.reportStatus.FAILED);
      throw error;
    }
  },

  sendSms: async (report) => {
    try {
      // Create SMS message
      const message = {
        to: this.config.sms.recipients.join(','),
        from: process.env.SMS_FROM,
        body: `
        [${report.level}] Error Report
        =============================

        Message: ${report.message}
        Timestamp: ${report.timestamp}
        Code: ${report.code}
        `
      };

      // Send SMS
      await this.sendSmsMessage(message);

      // Update report status
      await User.updateErrorReport(report.id, this.reportStatus.SENT);
    } catch (error) {
      await User.updateErrorReport(report.id, this.reportStatus.FAILED);
      throw error;
    }
  },

  sendWebhook: async (report) => {
    try {
      // Create webhook payload
      const payload = {
        id: report.id,
        timestamp: report.timestamp,
        level: report.level,
        message: report.message,
        stack: report.stack,
        code: report.code,
        details: report.details,
        metadata: report.metadata,
        userId: report.userId,
        ip: report.ip,
        userAgent: report.userAgent
      };

      // Send webhook
      await fetch(this.config.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': this.config.webhook.secret
        },
        body: JSON.stringify(payload)
      });

      // Update report status
      await User.updateErrorReport(report.id, this.reportStatus.SENT);
    } catch (error) {
      await User.updateErrorReport(report.id, this.reportStatus.FAILED);
      throw error;
    }
  },

  getReportStatistics: () => this.stats,

  getQueueStatistics: () => ({
    email: this.emailQueue.length,
    slack: this.slackQueue.length,
    sms: this.smsQueue.length,
    webhook: this.webhookQueue.length
  }),

  generateReport: async () => {
    try {
      const report = {
        timestamp: new Date(),
        statistics: this.stats,
        queueStatistics: this.getQueueStatistics(),
        recentReports: await this.getRecentReports(),
        recommendations: this.generateRecommendations()
      };

      // Save report
      await this.saveReport(report);

      return report;
    } catch (error) {
      throw error;
    }
  },

  getRecentReports: async () => {
    try {
      return await User.getRecentErrorReports(100);
    } catch (error) {
      throw error;
    }
  },

  generateRecommendations: () => {
    const recommendations = [];

    // Email recommendations
    if (this.stats.email > this.config.thresholds.email) {
      recommendations.push({
        priority: 'HIGH',
        description: 'High email volume detected',
        action: 'Review and optimize email notifications'
      });
    }

    // Slack recommendations
    if (this.stats.slack > this.config.thresholds.slack) {
      recommendations.push({
        priority: 'MEDIUM',
        description: 'High Slack message volume detected',
        action: 'Review and optimize Slack notifications'
      });
    }

    // SMS recommendations
    if (this.stats.sms > this.config.thresholds.sms) {
      recommendations.push({
        priority: 'HIGH',
        description: 'High SMS volume detected',
        action: 'Review and optimize SMS notifications'
      });
    }

    // Webhook recommendations
    if (this.stats.webhook > this.config.thresholds.webhook) {
      recommendations.push({
        priority: 'MEDIUM',
        description: 'High webhook volume detected',
        action: 'Review and optimize webhook notifications'
      });
    }

    // Failure rate recommendations
    if (this.stats.failures > 0) {
      recommendations.push({
        priority: 'HIGH',
        description: 'Reporting failures detected',
        action: 'Investigate and fix reporting failures'
      });
    }

    return recommendations;
  },

  saveReport: async (report) => {
    try {
      // Create report directory
      const reportDir = path.join(__dirname, '../../error-reporting-reports');
      await fs.mkdir(reportDir, { recursive: true });

      // Create report file
      const reportFile = path.join(
        reportDir,
        `error-reporting-report-${new Date(report.timestamp).toISOString().split('T')[0]}.json`
      );

      // Save report
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      // Save to database
      await User.createErrorReportingReport({
        id: crypto.randomUUID(),
        timestamp: report.timestamp,
        statistics: report.statistics,
        queueStatistics: report.queueStatistics,
        recentReports: report.recentReports,
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
      const reportDir = path.join(__dirname, '../../error-reporting-reports');
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

module.exports = errorReportingService;
