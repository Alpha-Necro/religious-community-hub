const { testingService } = require('../services/testingService');
const { securityAuditService } = require('../services/securityAuditService');
const { securityIncidentResponse } = require('../services/securityIncidentResponse');
const { errorService } = require('../services/errorService');
const User = require('../models/User');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const testConfig = {
  timeout: process.env.TEST_TIMEOUT || 30000,
  retries: process.env.TEST_MAX_RETRIES || 3,
  coverageThreshold: process.env.TEST_COVERAGE_THRESHOLD || 80,
  parallel: process.env.TEST_PARALLEL === 'true'
};

// Test helpers
const testHelpers = {
  generateTestData: async (type, count = 1) => {
    const testData = [];
    for (let i = 0; i < count; i++) {
      testData.push(await this.generateTestItem(type));
    }
    return testData;
  },

  generateTestItem: async (type) => {
    switch (type) {
      case 'user':
        return {
          id: crypto.randomUUID(),
          email: `test${crypto.randomUUID()}@example.com`,
          password: 'test123',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date()
        };
      case 'audit':
        return {
          id: crypto.randomUUID(),
          userId: crypto.randomUUID(),
          action: 'TEST_ACTION',
          resource: 'TEST_RESOURCE',
          resourceId: crypto.randomUUID(),
          success: true,
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          metadata: {},
          timestamp: new Date()
        };
      case 'incident':
        return {
          id: crypto.randomUUID(),
          type: 'TEST_INCIDENT',
          severity: 'TEST',
          description: 'Test incident',
          ip: '127.0.0.1',
          userId: crypto.randomUUID(),
          metadata: {},
          status: 'IN_PROGRESS',
          timestamp: new Date()
        };
      case 'error':
        return {
          id: crypto.randomUUID(),
          type: 'TEST_ERROR',
          message: 'Test error',
          code: 'TEST_ERROR',
          details: {},
          httpStatus: 500,
          level: 'TEST',
          timestamp: new Date()
        };
      default:
        throw new Error(`Unknown test type: ${type}`);
    }
  },

  cleanupTestData: async () => {
    await User.destroy({ where: { email: { [Op.like]: '%@example.com' } } });
    await User.destroy({ where: { type: 'TEST_ERROR' } });
    await User.destroy({ where: { type: 'TEST_INCIDENT' } });
    await User.destroy({ where: { action: 'TEST_ACTION' } });
  },

  generateReport: async (testRunId) => {
    return testingService.generateTestReport(testRunId);
  },

  saveReport: async (report) => {
    await testingService.saveReportToFile(report);
  },

  getCoverage: async () => {
    const coverage = await testingService.getCoverage();
    if (coverage.total < testConfig.coverageThreshold) {
      throw new Error(`Coverage below threshold: ${coverage.total}% < ${testConfig.coverageThreshold}%`);
    }
    return coverage;
  }
};

// Test setup
const setup = {
  beforeAll: async () => {
    // Initialize test database
    await User.sync({ force: true });

    // Initialize services
    await testingService.initialize();
    await securityAuditService.initialize();
    await securityIncidentResponse.initialize();
    await errorService.initialize();

    // Create test data
    await testHelpers.generateTestData('user', 10);
    await testHelpers.generateTestData('audit', 5);
    await testHelpers.generateTestData('incident', 3);
    await testHelpers.generateTestData('error', 2);
  },

  beforeEach: async () => {
    // Reset test data
    await testHelpers.cleanupTestData();
  },

  afterAll: async () => {
    // Clean up test data
    await testHelpers.cleanupTestData();

    // Close database connections
    await User.close();
  }
};

module.exports = {
  testConfig,
  testHelpers,
  setup
};
