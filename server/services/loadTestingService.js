const { performanceMonitor } = require('./performanceMonitor');
const { securityAuditService } = require('./securityAuditService');
const { Op } = require('sequelize');
const User = require('../models/User');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const k6 = require('k6');
const http = require('k6/http');

const loadTestingService = {
  testTypes: {
    BASELINE: 'BASELINE',
    STRESS: 'STRESS',
    SOAK: 'SOAK',
    SPIKE: 'SPIKE'
  },

  testMetrics: {
    RESPONSE_TIME: 'RESPONSE_TIME',
    THROUGHPUT: 'THROUGHPUT',
    ERROR_RATE: 'ERROR_RATE',
    RESOURCE_USAGE: 'RESOURCE_USAGE'
  },

  testStatus: {
    PENDING: 'PENDING',
    RUNNING: 'RUNNING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
  },

  initialize: async () => {
    try {
      // Initialize test configuration
      this.config = {
        baseline: {
          duration: process.env.LOAD_TEST_BASELINE_DURATION || '1m',
          vus: process.env.LOAD_TEST_BASELINE_VUS || 10,
          thresholds: {
            responseTime: process.env.LOAD_TEST_BASELINE_RESPONSE_TIME || 200,
            errorRate: process.env.LOAD_TEST_BASELINE_ERROR_RATE || 0.01
          }
        },
        stress: {
          duration: process.env.LOAD_TEST_STRESS_DURATION || '5m',
          vus: process.env.LOAD_TEST_STRESS_VUS || 100,
          thresholds: {
            responseTime: process.env.LOAD_TEST_STRESS_RESPONSE_TIME || 500,
            errorRate: process.env.LOAD_TEST_STRESS_ERROR_RATE || 0.05
          }
        },
        soak: {
          duration: process.env.LOAD_TEST_SOAK_DURATION || '30m',
          vus: process.env.LOAD_TEST_SOAK_VUS || 50,
          thresholds: {
            responseTime: process.env.LOAD_TEST_SOAK_RESPONSE_TIME || 300,
            errorRate: process.env.LOAD_TEST_SOAK_ERROR_RATE || 0.02
          }
        },
        spike: {
          duration: process.env.LOAD_TEST_SPIKE_DURATION || '1m',
          vus: process.env.LOAD_TEST_SPIKE_VUS || 500,
          thresholds: {
            responseTime: process.env.LOAD_TEST_SPIKE_RESPONSE_TIME || 1000,
            errorRate: process.env.LOAD_TEST_SPIKE_ERROR_RATE || 0.1
          }
        }
      };

      // Initialize test results
      this.results = {
        baseline: {},
        stress: {},
        soak: {},
        spike: {}
      };

      // Initialize test reports
      this.reports = {};

      // Initialize test monitoring
      this.monitoringInterval = setInterval(() => {
        this.monitorTestPerformance();
      }, process.env.LOAD_TEST_MONITOR_INTERVAL || 10000); // 10 seconds

      return true;
    } catch (error) {
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'LOAD_TEST_INITIALIZATION_FAILED',
        resource: 'LOAD_TESTING',
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

  runLoadTest: async (type, options = {}) => {
    try {
      // Validate test type
      if (!this.testTypes[type]) {
        throw new Error(`Invalid test type: ${type}`);
      }

      // Get test configuration
      const config = {
        ...this.config[type],
        ...options
      };

      // Create test ID
      const testId = crypto.randomUUID();

      // Create test report
      const report = {
        id: testId,
        type,
        startTime: new Date(),
        config,
        metrics: {
          responseTime: [],
          throughput: [],
          errorRate: [],
          resourceUsage: []
        },
        status: this.testStatus.RUNNING
      };

      // Start performance monitoring
      await performanceMonitor.initialize();

      // Run test
      const testResult = await this.runTest(type, config);

      // Update report
      report.endTime = new Date();
      report.duration = report.endTime - report.startTime;
      report.metrics = testResult.metrics;
      report.status = testResult.success ? this.testStatus.COMPLETED : this.testStatus.FAILED;

      // Save report
      await this.saveReport(report);

      // Generate recommendations
      const recommendations = this.generateRecommendations(report);

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'LOAD_TEST_COMPLETED',
        resource: 'LOAD_TESTING',
        resourceId: testId,
        success: testResult.success,
        ip: null,
        userAgent: null,
        metadata: {
          type,
          duration: report.duration,
          success: testResult.success,
          recommendations
        }
      });

      return {
        report,
        recommendations
      };
    } catch (error) {
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'LOAD_TEST_FAILED',
        resource: 'LOAD_TESTING',
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

  runTest: async (type, config) => {
    try {
      // Create test script
      const testScript = this.generateTestScript(type, config);

      // Run test using k6
      const result = await k6.run(testScript);

      // Process results
      const metrics = {
        responseTime: result.metrics.response_time,
        throughput: result.metrics.throughput,
        errorRate: result.metrics.error_rate,
        resourceUsage: result.metrics.resource_usage
      };

      // Check thresholds
      const success = this.checkThresholds(metrics, config.thresholds);

      return {
        success,
        metrics
      };
    } catch (error) {
      throw error;
    }
  },

  generateTestScript: (type, config) => {
    const script = `import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  duration: '${config.duration}',
  vus: ${config.vus},
};

export default function() {
  const endpoints = [
    '/api/v1/auth/login',
    '/api/v1/users',
    '/api/v1/events',
    '/api/v1/notifications'
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  const response = http.get(endpoint);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < ${config.thresholds.responseTime}ms': (r) => r.timings.duration < ${config.thresholds.responseTime}
  });

  sleep(1);
};`;

    return script;
  },

  checkThresholds: (metrics, thresholds) => {
    const checks = {
      responseTime: metrics.responseTime.p95 < thresholds.responseTime,
      errorRate: metrics.errorRate < thresholds.errorRate
    };

    return Object.values(checks).every(check => check);
  },

  monitorTestPerformance: async () => {
    try {
      // Get current metrics
      const metrics = await performanceMonitor.getMetrics();

      // Check thresholds
      if (metrics.responseTime.average > process.env.RESPONSE_TIME_THRESHOLD) {
        await securityAuditService.createAuditLog({
          userId: null,
          action: 'HIGH_RESPONSE_TIME',
          resource: 'LOAD_TESTING',
          resourceId: null,
          success: false,
          ip: null,
          userAgent: null,
          metadata: {
            responseTime: metrics.responseTime.average,
            threshold: process.env.RESPONSE_TIME_THRESHOLD
          }
        });
      }

      if (metrics.system.memory.usage > 90) {
        await securityAuditService.createAuditLog({
          userId: null,
          action: 'HIGH_MEMORY_USAGE',
          resource: 'LOAD_TESTING',
          resourceId: null,
          success: false,
          ip: null,
          userAgent: null,
          metadata: {
            memoryUsage: metrics.system.memory.usage,
            threshold: 90
          }
        });
      }

      if (metrics.system.cpu.usage > 90) {
        await securityAuditService.createAuditLog({
          userId: null,
          action: 'HIGH_CPU_USAGE',
          resource: 'LOAD_TESTING',
          resourceId: null,
          success: false,
          ip: null,
          userAgent: null,
          metadata: {
            cpuUsage: metrics.system.cpu.usage,
            threshold: 90
          }
        });
      }
    } catch (error) {
      throw error;
    }
  },

  saveReport: async (report) => {
    try {
      // Create report directory
      const reportDir = path.join(__dirname, '../../load-test-reports');
      await fs.mkdir(reportDir, { recursive: true });

      // Create report file
      const reportFile = path.join(
        reportDir,
        `load-test-report-${report.id}-${new Date(report.startTime).toISOString().split('T')[0]}.json`
      );

      // Save report
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      // Save to database
      await User.createLoadTestReport({
        id: report.id,
        type: report.type,
        startTime: report.startTime,
        endTime: report.endTime,
        duration: report.duration,
        config: report.config,
        metrics: report.metrics,
        status: report.status
      });

      // Rotate reports if needed
      await this.rotateReports();
    } catch (error) {
      throw error;
    }
  },

  rotateReports: async () => {
    try {
      const reportDir = path.join(__dirname, '../../load-test-reports');
      const files = await fs.readdir(reportDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - process.env.LOAD_TEST_REPORT_RETENTION_DAYS);

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

  generateRecommendations: (report) => {
    const recommendations = [];

    // Response time recommendations
    if (report.metrics.responseTime.p95 > report.config.thresholds.responseTime) {
      recommendations.push({
        priority: 'HIGH',
        description: 'High response time detected',
        action: 'Optimize response time or implement caching'
      });
    }

    // Error rate recommendations
    if (report.metrics.errorRate > report.config.thresholds.errorRate) {
      recommendations.push({
        priority: 'HIGH',
        description: 'High error rate detected',
        action: 'Investigate and fix error sources'
      });
    }

    // Memory usage recommendations
    if (report.metrics.resourceUsage.memory > 90) {
      recommendations.push({
        priority: 'MEDIUM',
        description: 'High memory usage detected',
        action: 'Optimize memory usage or increase memory limit'
      });
    }

    // CPU usage recommendations
    if (report.metrics.resourceUsage.cpu > 90) {
      recommendations.push({
        priority: 'MEDIUM',
        description: 'High CPU usage detected',
        action: 'Optimize CPU usage or increase CPU resources'
      });
    }

    // Throughput recommendations
    if (report.metrics.throughput < report.config.vus * 0.8) {
      recommendations.push({
        priority: 'LOW',
        description: 'Low throughput detected',
        action: 'Optimize request handling or increase resources'
      });
    }

    return recommendations;
  },

  getTestResults: async (testId) => {
    try {
      const report = await User.getLoadTestReport(testId);
      if (!report) {
        throw new Error(`Test report not found: ${testId}`);
      }

      return {
        report,
        recommendations: this.generateRecommendations(report)
      };
    } catch (error) {
      throw error;
    }
  },

  getTestHistory: async (type, limit = 10) => {
    try {
      const reports = await User.getLoadTestReports({
        type,
        limit
      });

      return reports.map(report => ({
        ...report,
        recommendations: this.generateRecommendations(report)
      }));
    } catch (error) {
      throw error;
    }
  },

  getTestStatistics: async (type) => {
    try {
      const reports = await User.getLoadTestReports({
        type
      });

      const stats = {
        count: reports.length,
        successRate: reports.filter(r => r.status === this.testStatus.COMPLETED).length / reports.length,
        averageDuration: reports.reduce((sum, r) => sum + r.duration, 0) / reports.length,
        averageResponseTime: reports.reduce((sum, r) => sum + r.metrics.responseTime.p95, 0) / reports.length,
        averageErrorRate: reports.reduce((sum, r) => sum + r.metrics.errorRate, 0) / reports.length
      };

      return stats;
    } catch (error) {
      throw error;
    }
  }
};

module.exports = loadTestingService;
