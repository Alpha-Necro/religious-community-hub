import { accessibilityService } from '../../../services/accessibilityService';
import { securityAuditService } from '../../../services/securityAuditService';
import { User } from '../../../models/User';

// Mock the User model
jest.mock('../../../models/User', () => ({
  User: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
}));

describe('AccessibilityService', () => {
  const testUserId = 'test-user-id';
  const testType = 'VISUAL';
  const testPreference = 'highContrast';

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const result = await accessibilityService.initialize();
      expect(result).toBe(true);
    });

    it('should throw error with invalid config', async () => {
      // @ts-ignore - Testing invalid config
      accessibilityService.config = null;
      await expect(accessibilityService.initialize()).rejects.toThrow();
    });
  });

  describe('setAccessibilityPreference', () => {
    it('should set preference successfully', async () => {
      const result = await accessibilityService.setAccessibilityPreference(
        testUserId,
        testType,
        testPreference
      );
      expect(result).toBe(true);

      const preference = await accessibilityService.getAccessibilityPreference(
        testUserId,
        testType
      );
      expect(preference).toBeDefined();
      expect(preference.type).toBe(testType);
      expect(preference.preference).toBe(testPreference);
    });

    it('should throw error with invalid user ID', async () => {
      await expect(
        accessibilityService.setAccessibilityPreference(
          null as any,
          testType,
          testPreference
        )
      ).rejects.toThrow();
    });

    it('should throw error with invalid type', async () => {
      await expect(
        accessibilityService.setAccessibilityPreference(
          testUserId,
          'INVALID_TYPE' as any,
          testPreference
        )
      ).rejects.toThrow();
    });

    it('should throw error with invalid preference', async () => {
      await expect(
        accessibilityService.setAccessibilityPreference(
          testUserId,
          testType,
          'INVALID_PREFERENCE' as any
        )
      ).rejects.toThrow();
    });
  });

  describe('getAccessibilityPreference', () => {
    it('should get preference successfully', async () => {
      await accessibilityService.setAccessibilityPreference(
        testUserId,
        testType,
        testPreference
      );

      const preference = await accessibilityService.getAccessibilityPreference(
        testUserId,
        testType
      );
      expect(preference).toBeDefined();
      expect(preference.type).toBe(testType);
      expect(preference.preference).toBe(testPreference);
    });

    it('should return null for non-existent preference', async () => {
      const preference = await accessibilityService.getAccessibilityPreference(
        testUserId,
        testType
      );
      expect(preference).toBeNull();
    });
  });

  describe('monitorAccessibility', () => {
    it('should monitor accessibility successfully', async () => {
      const result = await accessibilityService.monitorAccessibility();
      expect(result).toBe(true);
    });

    it('should create alerts for high error rate', async () => {
      // Mock high error rate
      jest.spyOn(accessibilityService, 'getAccessibilityStatistics').mockResolvedValue({
        errorRate: 0.15,
        failures: 1000,
        total: 10000,
      });

      await accessibilityService.monitorAccessibility();

      // Verify alert was created
      const alerts = await accessibilityService.getAccessibilityAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  describe('createAccessibilityAlert', () => {
    it('should create alert successfully', async () => {
      const alertId = await accessibilityService.createAccessibilityAlert({
        title: 'Test Alert',
        description: 'Test alert description',
        severity: 'WARNING',
        type: 'TEST',
        metadata: {},
      });

      expect(alertId).toBeDefined();

      const alerts = await accessibilityService.getAccessibilityAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  describe('updateAccessibilityAlert', () => {
    it('should update alert status successfully', async () => {
      const alertId = await accessibilityService.createAccessibilityAlert({
        title: 'Test Alert',
        description: 'Test alert description',
        severity: 'WARNING',
        type: 'TEST',
        metadata: {},
      });

      await accessibilityService.updateAccessibilityAlert(alertId, 'RESOLVED');

      const alerts = await accessibilityService.getAccessibilityAlerts();
      const alert = alerts.find((a) => a.id === alertId);
      expect(alert).toBeDefined();
      expect(alert.status).toBe('RESOLVED');
    });
  });
});
