const { testConfig, testHelpers, setup } = require('../setup');
const { securityAuditService } = require('../../services/securityAuditService');
const { securityIncidentResponse } = require('../../services/securityIncidentResponse');
const { errorService } = require('../../services/errorService');
const { Op } = require('sequelize');
const User = require('../../models/User');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

describe('Security Audit Service Integration', () => {
  beforeAll(setup.beforeAll);
  beforeEach(setup.beforeEach);
  afterAll(setup.afterAll);

  describe('integration with Security Incident Response', () => {
    it('should create incident on suspicious activity', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      testData.action = 'LOGIN';
      testData.success = false;

      // Create multiple failed attempts
      for (let i = 0; i < process.env.MAX_FAILED_ATTEMPTS; i++) {
        await securityAuditService.createAuditLog(testData);
      }

      const incidents = await User.findAll({
        where: {
          type: 'SECURITY_INCIDENT'
        }
      });

      expect(incidents.length).toBeGreaterThan(0);
      expect(incidents[0].severity).toBe('HIGH');
      expect(incidents[0].description).toContain('Multiple failed login attempts');
    });

    it('should handle incident response', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      testData.action = 'LOGIN';
      testData.success = false;

      // Create multiple failed attempts
      for (let i = 0; i < process.env.MAX_FAILED_ATTEMPTS; i++) {
        await securityAuditService.createAuditLog(testData);
      }

      const incidents = await User.findAll({
        where: {
          type: 'SECURITY_INCIDENT'
        }
      });

      expect(incidents.length).toBeGreaterThan(0);
      expect(incidents[0].status).toBe('RESOLVED');
      expect(incidents[0].resolution).toBeDefined();
    });
  });

  describe('integration with Error Service', () => {
    it('should create error on audit failure', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      testData.action = 'INVALID_ACTION';

      try {
        await securityAuditService.createAuditLog(testData);
      } catch (error) {
        const errors = await User.findAll({
          where: {
            type: 'AUDIT_FAILURE'
          }
        });

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Invalid audit action');
      }
    });

    it('should handle error notifications', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      testData.action = 'INVALID_ACTION';

      try {
        await securityAuditService.createAuditLog(testData);
      } catch (error) {
        const alerts = await User.findAll({
          where: {
            type: 'ERROR_NOTIFICATION'
          }
        });

        expect(alerts.length).toBeGreaterThan(0);
        expect(alerts[0].severity).toBe('ERROR');
        expect(alerts[0].description).toContain('Audit failure');
      }
    });
  });

  describe('integration with File System', () => {
    it('should rotate audit logs', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      await securityAuditService.createAuditLog(testData);

      // Create enough logs to trigger rotation
      for (let i = 0; i < process.env.AUDIT_LOG_FILE_SIZE_LIMIT; i++) {
        await securityAuditService.createAuditLog(testData);
      }

      const auditDir = path.join(__dirname, '../../audit-logs');
      const files = await fs.readdir(auditDir);
      expect(files.length).toBeGreaterThan(0);

      // Check file size
      const stats = await fs.stat(path.join(auditDir, files[0]));
      expect(stats.size).toBeLessThanOrEqual(process.env.AUDIT_LOG_FILE_SIZE_LIMIT);
    });

    it('should save security reports', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      await securityAuditService.createAuditLog(testData);

      await securityAuditService.generateSecurityReport();

      const reportDir = path.join(__dirname, '../../security-reports');
      const files = await fs.readdir(reportDir);
      expect(files.length).toBeGreaterThan(0);

      // Check report content
      const reportFile = path.join(reportDir, files[0]);
      const report = JSON.parse(await fs.readFile(reportFile, 'utf8'));
      expect(report.timestamp).toBeDefined();
      expect(report.statistics).toBeDefined();
    });
  });

  describe('integration with Security Monitoring', () => {
    it('should detect geographical anomalies', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      testData.action = 'LOGIN';
      testData.success = true;
      testData.metadata = {
        location: 'New York'
      };

      // Create login from different location
      await securityAuditService.createAuditLog(testData);

      const alerts = await User.findAll({
        where: {
          type: 'GEOGRAPHICAL_ANOMALY'
        }
      });

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].description).toContain('Login from different location');
    });

    it('should monitor access patterns', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      testData.action = 'LOGIN';
      testData.success = true;

      // Create multiple successful logins
      for (let i = 0; i < process.env.MAX_ACCESS_PER_HOUR; i++) {
        await securityAuditService.createAuditLog(testData);
      }

      const alerts = await User.findAll({
        where: {
          type: 'UNUSUAL_ACCESS_PATTERN'
        }
      });

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].description).toContain('Unusually high number of accesses');
    });
  });

  describe('integration with Performance Monitoring', () => {
    it('should monitor audit performance', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      
      // Measure performance
      const startTime = Date.now();
      await securityAuditService.createAuditLog(testData);
      const duration = Date.now() - startTime;

      const metrics = await User.findAll({
        where: {
          type: 'PERFORMANCE_METRIC'
        }
      });

      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].duration).toBeLessThanOrEqual(process.env.RESPONSE_TIME_THRESHOLD);
    });

    it('should handle performance alerts', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      
      // Simulate slow performance
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, process.env.RESPONSE_TIME_THRESHOLD * 2));
      await securityAuditService.createAuditLog(testData);
      const duration = Date.now() - startTime;

      const alerts = await User.findAll({
        where: {
          type: 'PERFORMANCE_ALERT'
        }
      });

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].severity).toBe('WARNING');
      expect(alerts[0].description).toContain('High response time');
    });
  });
});
