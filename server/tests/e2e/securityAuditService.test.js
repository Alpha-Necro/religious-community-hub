const { testConfig, testHelpers, setup } = require('../setup');
const { securityAuditService } = require('../../services/securityAuditService');
const { securityIncidentResponse } = require('../../services/securityIncidentResponse');
const { errorService } = require('../../services/errorService');
const { Op } = require('sequelize');
const User = require('../../models/User');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const request = require('supertest');
const app = require('../../app');

describe('Security Audit Service E2E', () => {
  beforeAll(setup.beforeAll);
  beforeEach(setup.beforeEach);
  afterAll(setup.afterAll);

  describe('E2E Audit Logging', () => {
    it('should log user login', async () => {
      const testData = await testHelpers.generateTestItem('user');
      const user = await User.create(testData);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: testData.password
        });

      expect(response.status).toBe(200);

      const auditLogs = await User.findAll({
        where: {
          action: 'LOGIN',
          userId: user.id,
          success: true
        }
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].resource).toBe('AUTHENTICATION');
    });

    it('should log failed login attempt', async () => {
      const testData = await testHelpers.generateTestItem('user');
      const user = await User.create(testData);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: 'wrong-password'
        });

      expect(response.status).toBe(401);

      const auditLogs = await User.findAll({
        where: {
          action: 'LOGIN',
          userId: user.id,
          success: false
        }
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].resource).toBe('AUTHENTICATION');
    });

    it('should log user registration', async () => {
      const testData = await testHelpers.generateTestItem('user');

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testData);

      expect(response.status).toBe(201);

      const auditLogs = await User.findAll({
        where: {
          action: 'REGISTER',
          success: true
        }
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].resource).toBe('AUTHENTICATION');
    });

    it('should log password reset', async () => {
      const testData = await testHelpers.generateTestItem('user');
      const user = await User.create(testData);

      // Request password reset
      const resetResponse = await request(app)
        .post('/api/v1/auth/password/reset')
        .send({
          email: user.email
        });

      expect(resetResponse.status).toBe(200);

      const auditLogs = await User.findAll({
        where: {
          action: 'PASSWORD_RESET_REQUEST',
          userId: user.id,
          success: true
        }
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].resource).toBe('AUTHENTICATION');
    });
  });

  describe('E2E Security Monitoring', () => {
    it('should detect multiple failed login attempts', async () => {
      const testData = await testHelpers.generateTestItem('user');
      const user = await User.create(testData);

      // Make multiple failed login attempts
      for (let i = 0; i < process.env.MAX_FAILED_ATTEMPTS; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: user.email,
            password: 'wrong-password'
          });
      }

      const alerts = await User.findAll({
        where: {
          type: 'SUSPICIOUS_ACTIVITY'
        }
      });

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].description).toContain('Multiple failed login attempts');
    });

    it('should detect geographical anomalies', async () => {
      const testData = await testHelpers.generateTestItem('user');
      const user = await User.create(testData);

      // Login from different locations
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: testData.password
        })
        .set('X-Forwarded-For', '1.2.3.4');

      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: testData.password
        })
        .set('X-Forwarded-For', '5.6.7.8');

      const alerts = await User.findAll({
        where: {
          type: 'GEOGRAPHICAL_ANOMALY'
        }
      });

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].description).toContain('Login from different location');
    });

    it('should detect unusual access patterns', async () => {
      const testData = await testHelpers.generateTestItem('user');
      const user = await User.create(testData);

      // Login multiple times
      for (let i = 0; i < process.env.MAX_ACCESS_PER_HOUR; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: user.email,
            password: testData.password
          });
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

  describe('E2E Incident Response', () => {
    it('should handle security incident', async () => {
      const testData = await testHelpers.generateTestItem('user');
      const user = await User.create(testData);

      // Make multiple failed login attempts to trigger incident
      for (let i = 0; i < process.env.MAX_FAILED_ATTEMPTS; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: user.email,
            password: 'wrong-password'
          });
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

    it('should notify security team', async () => {
      const testData = await testHelpers.generateTestItem('user');
      const user = await User.create(testData);

      // Make multiple failed login attempts to trigger notification
      for (let i = 0; i < process.env.MAX_FAILED_ATTEMPTS; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: user.email,
            password: 'wrong-password'
          });
      }

      const notifications = await User.findAll({
        where: {
          type: 'SECURITY_NOTIFICATION'
        }
      });

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].severity).toBe('HIGH');
      expect(notifications[0].description).toContain('Security incident');
    });
  });

  describe('E2E Performance Monitoring', () => {
    it('should monitor response times', async () => {
      const testData = await testHelpers.generateTestItem('user');
      const user = await User.create(testData);

      // Measure login response time
      const startTime = Date.now();
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: testData.password
        });
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThanOrEqual(process.env.RESPONSE_TIME_THRESHOLD);

      const metrics = await User.findAll({
        where: {
          type: 'PERFORMANCE_METRIC'
        }
      });

      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].duration).toBeLessThanOrEqual(duration);
    });

    it('should handle performance alerts', async () => {
      const testData = await testHelpers.generateTestItem('user');
      const user = await User.create(testData);

      // Simulate slow response
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, process.env.RESPONSE_TIME_THRESHOLD * 2));
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: testData.password
        });
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);

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

  describe('E2E File System Integration', () => {
    it('should save audit logs to file', async () => {
      const testData = await testHelpers.generateTestItem('user');
      const user = await User.create(testData);

      // Perform login to create audit log
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: testData.password
        });

      const auditDir = path.join(__dirname, '../../audit-logs');
      const files = await fs.readdir(auditDir);
      expect(files.length).toBeGreaterThan(0);

      // Check file content
      const logFile = path.join(auditDir, files[0]);
      const logs = await fs.readFile(logFile, 'utf8');
      expect(logs).toContain('LOGIN');
      expect(logs).toContain(user.id);
    });

    it('should save security reports', async () => {
      const testData = await testHelpers.generateTestItem('user');
      const user = await User.create(testData);

      // Perform login to create audit log
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: testData.password
        });

      // Generate security report
      await request(app)
        .get('/api/v1/security/report')
        .set('Authorization', `Bearer ${user.token}`);

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
});
