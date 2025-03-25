import { testPool } from '../config/database.test';
import { initializeTestDatabase, cleanupTestDatabase } from '../config/database.test';
import { initializeRedis } from '../utils/redisHealthCheck';

// Mock performance monitoring
jest.mock('../../server/src/services/performanceMonitor', () => ({
  updateMetrics: jest.fn(),
  start: jest.fn(),
  stop: jest.fn()
}));

// Mock security alerts
jest.mock('../../server/src/services/securityAlertService', () => ({
  sendAlert: jest.fn()
}));

// Mock Redis service
jest.mock('../../server/src/services/redisService', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  ping: jest.fn()
}));

// Mock Cache service
jest.mock('../../server/src/services/cacheService', () => ({
  set: jest.fn(),
  get: jest.fn(),
  delete: jest.fn()
}));

// Mock database health check
jest.mock('../../server/src/services/databaseHealthCheck', () => ({
  startHealthCheck: jest.fn(),
  stopHealthCheck: jest.fn(),
  validateConnection: jest.fn()
}));

// Global test setup
beforeAll(async () => {
  try {
    await initializeTestDatabase();
    await initializeRedis();
    // Initialize mocks
    jest.clearAllMocks();
    // Start performance monitoring
    const performanceMonitor = require('../../server/src/services/performanceMonitor');
    performanceMonitor.start();
    // Initialize Redis connection
    const redisService = require('../../server/src/services/redisService');
    await redisService.connect();
    // Start database health check
    const databaseHealthCheck = require('../../server/src/services/databaseHealthCheck');
    await databaseHealthCheck.startHealthCheck();
  } catch (error) {
    console.error('Error setting up test environment:', error);
    throw error;
  }
});

// Global test teardown
afterAll(async () => {
  try {
    await cleanupTestDatabase();
    // Clean up Redis connection
    const redisService = require('../../server/src/services/redisService');
    await redisService.disconnect();
    // Stop performance monitoring
    const performanceMonitor = require('../../server/src/services/performanceMonitor');
    performanceMonitor.stop();
    // Stop database health check
    const databaseHealthCheck = require('../../server/src/services/databaseHealthCheck');
    await databaseHealthCheck.stopHealthCheck();
  } catch (error) {
    console.error('Error cleaning up test environment:', error);
    throw error;
  }
});

// Per-test cleanup
afterEach(() => {
  jest.clearAllMocks();
});

// Helper function to clear test data between tests
export async function clearTestData(): Promise<void> {
  try {
    await testPool.query('TRUNCATE TABLE users CASCADE');
    await testPool.query('TRUNCATE TABLE events CASCADE');
    await testPool.query('TRUNCATE TABLE attendance CASCADE');
  } catch (error) {
    console.error('Error clearing test data:', error);
    throw error;
  }
}
