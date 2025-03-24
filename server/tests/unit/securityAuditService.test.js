const { testConfig, testHelpers, setup } = require('../setup');
const { securityAuditService } = require('../../services/securityAuditService');
const { Op } = require('sequelize');
const User = require('../../models/User');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

describe('Security Audit Service', () => {
  beforeAll(setup.beforeAll);
  beforeEach(setup.beforeEach);
  afterAll(setup.afterAll);

  describe('createAuditLog', () => {
    it('should create a new audit log', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      const result = await securityAuditService.createAuditLog(testData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.userId).toBe(testData.userId);
      expect(result.action).toBe(testData.action);
      expect(result.resource).toBe(testData.resource);
      expect(result.resourceId).toBe(testData.resourceId);
      expect(result.success).toBe(testData.success);
      expect(result.ip).toBe(testData.ip);
      expect(result.userAgent).toBe(testData.userAgent);
      expect(result.metadata).toEqual(testData.metadata);
      expect(result.timestamp).toBeDefined();
    });

    it('should create audit log file', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      await securityAuditService.createAuditLog(testData);

      const auditDir = path.join(__dirname, '../../audit-logs');
      const files = await fs.readdir(auditDir);
      expect(files.length).toBeGreaterThan(0);
    });

    it('should monitor suspicious activity', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      testData.action = 'LOGIN';
      testData.success = false;

      const result = await securityAuditService.createAuditLog(testData);
      expect(result).toBeDefined();

      const alerts = await User.findAll({
        where: {
          type: 'SUSPICIOUS_ACTIVITY'
        }
      });
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      await securityAuditService.createAuditLog(testData);

      const logs = await securityAuditService.getAuditLogs({
        userId: testData.userId,
        action: testData.action,
        resource: testData.resource
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].userId).toBe(testData.userId);
      expect(logs[0].action).toBe(testData.action);
      expect(logs[0].resource).toBe(testData.resource);
    });

    it('should filter audit logs by date', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      await securityAuditService.createAuditLog(testData);

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const logs = await securityAuditService.getAuditLogs({
        startDate: yesterday,
        endDate: today
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].timestamp).toBeGreaterThanOrEqual(yesterday);
      expect(logs[0].timestamp).toBeLessThanOrEqual(today);
    });
  });

  describe('generateSecurityReport', () => {
    it('should generate a security report', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      await securityAuditService.createAuditLog(testData);

      const report = await securityAuditService.generateSecurityReport();
      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.statistics).toBeDefined();
      expect(report.suspiciousActivities).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should save security report to file', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      await securityAuditService.createAuditLog(testData);

      await securityAuditService.generateSecurityReport();

      const reportDir = path.join(__dirname, '../../security-reports');
      const files = await fs.readdir(reportDir);
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe('monitorSuspiciousActivity', () => {
    it('should detect multiple failed attempts', async () => {
      const testData = await testHelpers.generateTestItem('audit');
      testData.action = 'LOGIN';
      testData.success = false;

      for (let i = 0; i < process.env.MAX_FAILED_ATTEMPTS; i++) {
        await securityAuditService.createAuditLog(testData);
      }

      const alerts = await User.findAll({
        where: {
          type: 'SUSPICIOUS_ACTIVITY'
        }
      });
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should detect unusual access patterns', async () => {
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
    });
  });
});
