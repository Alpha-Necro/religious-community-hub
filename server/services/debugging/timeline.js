const { securityAuditService } = require('../../../securityAuditService');
const { Op } = require('sequelize');
const User = require('../../../../models/User');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const Timeline = function(config) {
  this.config = config || {
    enabled: true,
    interval: 1000, // 1 second
    maxEntries: 1000
  };

  this.entries = [];
  this.currentEntry = null;
  this.interval = null;

  this.initialize = async () => {
    try {
      // Initialize timeline
      if (this.config.enabled) {
        this.interval = setInterval(() => {
          this.processEntries();
        }, this.config.interval);
      }

      return true;
    } catch (error) {
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'TIMELINE_INITIALIZATION_FAILED',
        resource: 'TIMELINE',
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
  };

  this.start = async (options = {}) => {
    try {
      // Create entry ID
      const entryId = crypto.randomUUID();

      // Create entry
      this.currentEntry = {
        id: entryId,
        timestamp: new Date(),
        type: options.type || 'STATE_CHANGE',
        action: options.action || 'START',
        metadata: options.metadata || {},
        duration: 0
      };

      // Add entry
      this.entries.push(this.currentEntry);

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: options.userId,
        action: 'TIMELINE_STARTED',
        resource: 'TIMELINE',
        resourceId: entryId,
        success: true,
        ip: options.ip,
        userAgent: options.userAgent,
        metadata: {
          entry: this.currentEntry
        }
      });

      return entryId;
    } catch (error) {
      throw error;
    }
  };

  this.end = async (entryId, options = {}) => {
    try {
      // Find entry
      const entry = this.entries.find(e => e.id === entryId);
      if (!entry) {
        throw new Error(`Entry not found: ${entryId}`);
      }

      // Update entry
      entry.action = options.action || 'END';
      entry.duration = new Date() - entry.timestamp;
      entry.metadata = { ...entry.metadata, ...options.metadata };

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: options.userId,
        action: 'TIMELINE_ENDED',
        resource: 'TIMELINE',
        resourceId: entryId,
        success: true,
        ip: options.ip,
        userAgent: options.userAgent,
        metadata: {
          entry
        }
      });

      return entry;
    } catch (error) {
      throw error;
    }
  };

  this.get = async (entryId, options = {}) => {
    try {
      // Find entry
      const entry = this.entries.find(e => e.id === entryId);
      if (!entry) {
        throw new Error(`Entry not found: ${entryId}`);
      }

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: options.userId,
        action: 'TIMELINE_GET',
        resource: 'TIMELINE',
        resourceId: entryId,
        success: true,
        ip: options.ip,
        userAgent: options.userAgent,
        metadata: {
          entry
        }
      });

      return entry;
    } catch (error) {
      throw error;
    }
  };

  this.processEntries = async () => {
    try {
      // Process entries
      for (const entry of this.entries) {
        // Update duration
        if (entry.action === 'START') {
          entry.duration = new Date() - entry.timestamp;
        }

        // Save to database
        await User.createTimelineEntry(entry);
      }

      // Remove old entries
      if (this.entries.length > this.config.maxEntries) {
        this.entries = this.entries.slice(-this.config.maxEntries);
      }

      return true;
    } catch (error) {
      throw error;
    }
  };

  this.getStatistics = async () => {
    try {
      // Get statistics
      const stats = await User.getTimelineStatistics();

      // Calculate averages
      const avgDuration = stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length;
      const avgInterval = stats.intervals.reduce((a, b) => a + b, 0) / stats.intervals.length;

      return {
        total: stats.total,
        active: stats.active,
        completed: stats.completed,
        avgDuration,
        avgInterval
      };
    } catch (error) {
      throw error;
    }
  };

  this.generateReport = async () => {
    try {
      const report = {
        timestamp: new Date(),
        statistics: await this.getStatistics(),
        recentEntries: await this.getRecentEntries(),
        recommendations: this.generateRecommendations()
      };

      // Save report
      await this.saveReport(report);

      return report;
    } catch (error) {
      throw error;
    }
  };

  this.getRecentEntries = async () => {
    try {
      return await User.getRecentTimelineEntries(100);
    } catch (error) {
      throw error;
    }
  };

  this.generateRecommendations = () => {
    const recommendations = [];

    // Duration recommendations
    if (this.stats.avgDuration > 1000) {
      recommendations.push({
        priority: 'HIGH',
        description: 'High average duration detected',
        action: 'Optimize state changes'
      });
    }

    // Interval recommendations
    if (this.stats.avgInterval > 1000) {
      recommendations.push({
        priority: 'MEDIUM',
        description: 'High average interval detected',
        action: 'Optimize state updates'
      });
    }

    // Entry count recommendations
    if (this.stats.total < 100) {
      recommendations.push({
        priority: 'LOW',
        description: 'Low number of entries detected',
        action: 'Increase state tracking'
      });
    }

    return recommendations;
  };

  this.saveReport = async (report) => {
    try {
      // Create report directory
      const reportDir = path.join(__dirname, '../../../timeline-reports');
      await fs.mkdir(reportDir, { recursive: true });

      // Create report file
      const reportFile = path.join(
        reportDir,
        `timeline-report-${new Date(report.timestamp).toISOString().split('T')[0]}.json`
      );

      // Save report
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      // Save to database
      await User.createTimelineReport({
        id: crypto.randomUUID(),
        timestamp: report.timestamp,
        statistics: report.statistics,
        recentEntries: report.recentEntries,
        recommendations: report.recommendations
      });

      // Rotate reports if needed
      await this.rotateReports();
    } catch (error) {
      throw error;
    }
  };

  this.rotateReports = async () => {
    try {
      const reportDir = path.join(__dirname, '../../../timeline-reports');
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
  };
};

module.exports = Timeline;
