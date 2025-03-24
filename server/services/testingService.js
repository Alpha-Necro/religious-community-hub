const { securityAlertService } = require('./securityAlertService');
const { performanceMonitor } = require('./performanceMonitor');
const { securityAuditService } = require('./securityAuditService');
const { Op } = require('sequelize');
const User = require('../models/User');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const testingService = {
  testTypes: {
    UNIT: 'UNIT_TEST',
    INTEGRATION: 'INTEGRATION_TEST',
    END_TO_END: 'END_TO_END_TEST',
    SECURITY: 'SECURITY_TEST',
    PERFORMANCE: 'PERFORMANCE_TEST',
    STRESS: 'STRESS_TEST'
  },

  testStatus: {
    PENDING: 'PENDING',
    RUNNING: 'RUNNING',
    PASSED: 'PASSED',
    FAILED: 'FAILED',
    SKIPPED: 'SKIPPED'
  },

  async runTests({
    type = this.testTypes.UNIT,
    suite = 'all',
    environment = 'test',
    parallel = false,
    timeout = 30000
  }) {
    try {
      // Create test run record
      const testRunId = crypto.randomUUID();
      const testRun = {
        id: testRunId,
        type,
        suite,
        environment,
        parallel,
        timeout,
        status: this.testStatus.RUNNING,
        startTime: new Date()
      };

      // Save to database
      await User.createTestRun(testRun);

      // Save to file system
      await this.saveTestRunToFile(testRun);

      // Run tests based on type
      const testResults = await this.runTestType(type, testRunId);

      // Update test run status
      await this.updateTestRunStatus(testRunId, testResults);

      // Create audit log
      await securityAuditService.createAuditLog({
        userId: null,
        action: 'TEST_RUN_COMPLETED',
        resource: 'TESTING',
        resourceId: testRunId,
        success: testResults.overallStatus === this.testStatus.PASSED,
        ip: null,
        userAgent: null,
        metadata: {
          type,
          suite,
          environment,
          results: testResults
        }
      });

      return testResults;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Test Run Failed',
        description: `Test run failed: ${error.message}`,
        severity: 'ERROR',
        type: 'TEST_RUN_FAILED',
        metadata: {
          error: error.message,
          testType: type,
          suite: suite,
          environment: environment
        }
      });

      throw error;
    }
  },

  async runTestType(type, testRunId) {
    try {
      let testResults = {
        overallStatus: this.testStatus.PASSED,
        tests: [],
        startTime: new Date(),
        endTime: null,
        duration: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      };

      switch (type) {
        case this.testTypes.UNIT:
          testResults = await this.runUnitTests(testRunId);
          break;
        case this.testTypes.INTEGRATION:
          testResults = await this.runIntegrationTests(testRunId);
          break;
        case this.testTypes.END_TO_END:
          testResults = await this.runEndToEndTests(testRunId);
          break;
        case this.testTypes.SECURITY:
          testResults = await this.runSecurityTests(testRunId);
          break;
        case this.testTypes.PERFORMANCE:
          testResults = await this.runPerformanceTests(testRunId);
          break;
        case this.testTypes.STRESS:
          testResults = await this.runStressTests(testRunId);
          break;
        default:
          throw new Error(`Unknown test type: ${type}`);
      }

      testResults.endTime = new Date();
      testResults.duration = testResults.endTime - testResults.startTime;

      return testResults;
    } catch (error) {
      throw error;
    }
  },

  async runUnitTests(testRunId) {
    try {
      const testResults = {
        overallStatus: this.testStatus.PASSED,
        tests: [],
        startTime: new Date(),
        endTime: null,
        duration: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      };

      // Run unit tests
      const unitTests = await this.getUnitTests();
      for (const test of unitTests) {
        const result = await this.runTest(test, testRunId);
        testResults.tests.push(result);

        if (result.status === this.testStatus.FAILED) {
          testResults.overallStatus = this.testStatus.FAILED;
        }

        testResults.passed += result.status === this.testStatus.PASSED ? 1 : 0;
        testResults.failed += result.status === this.testStatus.FAILED ? 1 : 0;
        testResults.skipped += result.status === this.testStatus.SKIPPED ? 1 : 0;
      }

      return testResults;
    } catch (error) {
      throw error;
    }
  },

  async runIntegrationTests(testRunId) {
    try {
      const testResults = {
        overallStatus: this.testStatus.PASSED,
        tests: [],
        startTime: new Date(),
        endTime: null,
        duration: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      };

      // Run integration tests
      const integrationTests = await this.getIntegrationTests();
      for (const test of integrationTests) {
        const result = await this.runTest(test, testRunId);
        testResults.tests.push(result);

        if (result.status === this.testStatus.FAILED) {
          testResults.overallStatus = this.testStatus.FAILED;
        }

        testResults.passed += result.status === this.testStatus.PASSED ? 1 : 0;
        testResults.failed += result.status === this.testStatus.FAILED ? 1 : 0;
        testResults.skipped += result.status === this.testStatus.SKIPPED ? 1 : 0;
      }

      return testResults;
    } catch (error) {
      throw error;
    }
  },

  async runEndToEndTests(testRunId) {
    try {
      const testResults = {
        overallStatus: this.testStatus.PASSED,
        tests: [],
        startTime: new Date(),
        endTime: null,
        duration: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      };

      // Run end-to-end tests
      const e2eTests = await this.getEndToEndTests();
      for (const test of e2eTests) {
        const result = await this.runTest(test, testRunId);
        testResults.tests.push(result);

        if (result.status === this.testStatus.FAILED) {
          testResults.overallStatus = this.testStatus.FAILED;
        }

        testResults.passed += result.status === this.testStatus.PASSED ? 1 : 0;
        testResults.failed += result.status === this.testStatus.FAILED ? 1 : 0;
        testResults.skipped += result.status === this.testStatus.SKIPPED ? 1 : 0;
      }

      return testResults;
    } catch (error) {
      throw error;
    }
  },

  async runSecurityTests(testRunId) {
    try {
      const testResults = {
        overallStatus: this.testStatus.PASSED,
        tests: [],
        startTime: new Date(),
        endTime: null,
        duration: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      };

      // Run security tests
      const securityTests = await this.getSecurityTests();
      for (const test of securityTests) {
        const result = await this.runTest(test, testRunId);
        testResults.tests.push(result);

        if (result.status === this.testStatus.FAILED) {
          testResults.overallStatus = this.testStatus.FAILED;
        }

        testResults.passed += result.status === this.testStatus.PASSED ? 1 : 0;
        testResults.failed += result.status === this.testStatus.FAILED ? 1 : 0;
        testResults.skipped += result.status === this.testStatus.SKIPPED ? 1 : 0;
      }

      return testResults;
    } catch (error) {
      throw error;
    }
  },

  async runPerformanceTests(testRunId) {
    try {
      const testResults = {
        overallStatus: this.testStatus.PASSED,
        tests: [],
        startTime: new Date(),
        endTime: null,
        duration: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      };

      // Run performance tests
      const performanceTests = await this.getPerformanceTests();
      for (const test of performanceTests) {
        const result = await this.runTest(test, testRunId);
        testResults.tests.push(result);

        if (result.status === this.testStatus.FAILED) {
          testResults.overallStatus = this.testStatus.FAILED;
        }

        testResults.passed += result.status === this.testStatus.PASSED ? 1 : 0;
        testResults.failed += result.status === this.testStatus.FAILED ? 1 : 0;
        testResults.skipped += result.status === this.testStatus.SKIPPED ? 1 : 0;
      }

      return testResults;
    } catch (error) {
      throw error;
    }
  },

  async runStressTests(testRunId) {
    try {
      const testResults = {
        overallStatus: this.testStatus.PASSED,
        tests: [],
        startTime: new Date(),
        endTime: null,
        duration: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      };

      // Run stress tests
      const stressTests = await this.getStressTests();
      for (const test of stressTests) {
        const result = await this.runTest(test, testRunId);
        testResults.tests.push(result);

        if (result.status === this.testStatus.FAILED) {
          testResults.overallStatus = this.testStatus.FAILED;
        }

        testResults.passed += result.status === this.testStatus.PASSED ? 1 : 0;
        testResults.failed += result.status === this.testStatus.FAILED ? 1 : 0;
        testResults.skipped += result.status === this.testStatus.SKIPPED ? 1 : 0;
      }

      return testResults;
    } catch (error) {
      throw error;
    }
  },

  async runTest(test, testRunId) {
    try {
      // Create test record
      const testId = crypto.randomUUID();
      const testRecord = {
        id: testId,
        testRunId,
        name: test.name,
        description: test.description,
        type: test.type,
        status: this.testStatus.RUNNING,
        startTime: new Date()
      };

      // Save to database
      await User.createTest(testRecord);

      // Save to file system
      await this.saveTestToFile(testRecord);

      // Run test
      const result = await test.run();

      // Update test status
      await this.updateTestStatus(testId, result);

      return result;
    } catch (error) {
      throw error;
    }
  },

  async getUnitTests() {
    try {
      // Get unit tests from test files
      const testFiles = await fs.readdir(path.join(__dirname, '../../tests/unit'));
      const tests = [];

      for (const file of testFiles) {
        if (file.endsWith('.test.js')) {
          const testModule = require(path.join(__dirname, '../../tests/unit', file));
          tests.push(...testModule.tests);
        }
      }

      return tests;
    } catch (error) {
      throw error;
    }
  },

  async getIntegrationTests() {
    try {
      // Get integration tests from test files
      const testFiles = await fs.readdir(path.join(__dirname, '../../tests/integration'));
      const tests = [];

      for (const file of testFiles) {
        if (file.endsWith('.test.js')) {
          const testModule = require(path.join(__dirname, '../../tests/integration', file));
          tests.push(...testModule.tests);
        }
      }

      return tests;
    } catch (error) {
      throw error;
    }
  },

  async getEndToEndTests() {
    try {
      // Get end-to-end tests from test files
      const testFiles = await fs.readdir(path.join(__dirname, '../../tests/e2e'));
      const tests = [];

      for (const file of testFiles) {
        if (file.endsWith('.test.js')) {
          const testModule = require(path.join(__dirname, '../../tests/e2e', file));
          tests.push(...testModule.tests);
        }
      }

      return tests;
    } catch (error) {
      throw error;
    }
  },

  async getSecurityTests() {
    try {
      // Get security tests from test files
      const testFiles = await fs.readdir(path.join(__dirname, '../../tests/security'));
      const tests = [];

      for (const file of testFiles) {
        if (file.endsWith('.test.js')) {
          const testModule = require(path.join(__dirname, '../../tests/security', file));
          tests.push(...testModule.tests);
        }
      }

      return tests;
    } catch (error) {
      throw error;
    }
  },

  async getPerformanceTests() {
    try {
      // Get performance tests from test files
      const testFiles = await fs.readdir(path.join(__dirname, '../../tests/performance'));
      const tests = [];

      for (const file of testFiles) {
        if (file.endsWith('.test.js')) {
          const testModule = require(path.join(__dirname, '../../tests/performance', file));
          tests.push(...testModule.tests);
        }
      }

      return tests;
    } catch (error) {
      throw error;
    }
  },

  async getStressTests() {
    try {
      // Get stress tests from test files
      const testFiles = await fs.readdir(path.join(__dirname, '../../tests/stress'));
      const tests = [];

      for (const file of testFiles) {
        if (file.endsWith('.test.js')) {
          const testModule = require(path.join(__dirname, '../../tests/stress', file));
          tests.push(...testModule.tests);
        }
      }

      return tests;
    } catch (error) {
      throw error;
    }
  },

  async saveTestRunToFile(testRun) {
    try {
      const testRunDir = path.join(__dirname, '../../test-runs');
      await fs.mkdir(testRunDir, { recursive: true });

      const date = new Date(testRun.startTime).toISOString().split('T')[0];
      const testRunFile = path.join(
        testRunDir,
        `${date}-${testRun.id}.json`
      );

      await fs.writeFile(testRunFile, JSON.stringify(testRun, null, 2));

      // Rotate logs if needed
      await this.rotateTestRuns();
    } catch (error) {
      throw error;
    }
  },

  async saveTestToFile(test) {
    try {
      const testDir = path.join(__dirname, '../../tests/results');
      await fs.mkdir(testDir, { recursive: true });

      const date = new Date(test.startTime).toISOString().split('T')[0];
      const testFile = path.join(
        testDir,
        `${date}-${test.id}.json`
      );

      await fs.writeFile(testFile, JSON.stringify(test, null, 2));

      // Rotate logs if needed
      await this.rotateTestResults();
    } catch (error) {
      throw error;
    }
  },

  async rotateTestRuns() {
    try {
      const testRunDir = path.join(__dirname, '../../test-runs');
      const files = await fs.readdir(testRunDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - process.env.TEST_RUN_RETENTION_DAYS);

      for (const file of files) {
        const filePath = path.join(testRunDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.birthtime < cutoffDate) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      throw error;
    }
  },

  async rotateTestResults() {
    try {
      const testDir = path.join(__dirname, '../../tests/results');
      const files = await fs.readdir(testDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - process.env.TEST_RESULT_RETENTION_DAYS);

      for (const file of files) {
        const filePath = path.join(testDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.birthtime < cutoffDate) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      throw error;
    }
  },

  async updateTestRunStatus(testRunId, results) {
    try {
      await User.update({
        status: results.overallStatus,
        endTime: new Date(),
        duration: results.duration,
        passed: results.passed,
        failed: results.failed,
        skipped: results.skipped
      }, {
        where: { id: testRunId }
      });
    } catch (error) {
      throw error;
    }
  },

  async updateTestStatus(testId, result) {
    try {
      await User.update({
        status: result.status,
        endTime: new Date(),
        duration: result.duration,
        output: result.output,
        error: result.error
      }, {
        where: { id: testId }
      });
    } catch (error) {
      throw error;
    }
  },

  async getTestResults({
    testRunId,
    testId,
    type,
    status,
    startDate,
    endDate,
    limit = 100,
    offset = 0
  }) {
    try {
      const where = {};

      if (testRunId) where.testRunId = testRunId;
      if (testId) where.id = testId;
      if (type) where.type = type;
      if (status) where.status = status;

      if (startDate) {
        where.startTime = {
          [Op.gte]: new Date(startDate)
        };
      }

      if (endDate) {
        if (!where.startTime) {
          where.startTime = {};
        }
        where.startTime[Op.lte] = new Date(endDate);
      }

      const testResults = await User.findAll({
        where,
        limit,
        offset,
        order: [['startTime', 'DESC']]
      });

      return testResults;
    } catch (error) {
      throw error;
    }
  },

  async generateTestReport(testRunId) {
    try {
      const testRun = await User.findOne({
        where: { id: testRunId }
      });

      if (!testRun) {
        throw new Error('Test run not found');
      }

      const report = {
        testRunId: testRun.id,
        type: testRun.type,
        suite: testRun.suite,
        environment: testRun.environment,
        parallel: testRun.parallel,
        timeout: testRun.timeout,
        status: testRun.status,
        startTime: testRun.startTime,
        endTime: testRun.endTime,
        duration: testRun.duration,
        passed: testRun.passed,
        failed: testRun.failed,
        skipped: testRun.skipped,
        tests: await this.getTestResults({ testRunId })
      };

      // Save report to file
      await this.saveReportToFile(report);

      return report;
    } catch (error) {
      throw error;
    }
  },

  async saveReportToFile(report) {
    try {
      const reportDir = path.join(__dirname, '../../test-reports');
      await fs.mkdir(reportDir, { recursive: true });

      const reportFile = path.join(
        reportDir,
        `test-report-${report.testRunId}-${new Date(report.startTime).toISOString().split('T')[0]}.json`
      );

      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      // Rotate reports if needed
      await this.rotateReports();
    } catch (error) {
      throw error;
    }
  },

  async rotateReports() {
    try {
      const reportDir = path.join(__dirname, '../../test-reports');
      const files = await fs.readdir(reportDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - process.env.TEST_REPORT_RETENTION_DAYS);

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

module.exports = testingService;
