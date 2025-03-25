import 'reflect-metadata';
import { config } from 'dotenv';
import { createConnection, getConnection } from 'typeorm';
import { performanceMonitor } from '../services/performanceMonitor';
import { cachingService } from '../services/cachingService';
import { databaseService } from '../services/databaseService';
import { requestHandler } from '../middleware/requestHandler';

// Load environment variables
config();

// Initialize services before tests
beforeAll(async () => {
  await performanceMonitor.initialize();
  await cachingService.initialize();
  await databaseService.initialize();
  await requestHandler.initialize();

  // Create test database connection
  await createConnection({
    type: 'sqlite',
    database: ':memory:',
    entities: ['dist/**/*.entity.js'],
    synchronize: true,
    dropSchema: true,
  });
});

// Reset services between tests
beforeEach(() => {
  jest.clearAllMocks();
  performanceMonitor.resetMetrics();
  cachingService.clear('test');
  databaseService.resetMetrics();
  requestHandler.resetMetrics();

  // Clear database before each test
  const connection = getConnection();
  const entities = connection.entityMetadatas;

  for (const entity of entities) {
    const repository = connection.getRepository(entity.name);
    await repository.clear();
  }
});

// Clean up after all tests
afterAll(async () => {
  await performanceMonitor.cleanup();
  await cachingService.cleanup();
  await databaseService.cleanup();
  await requestHandler.cleanup();

  // Close database connection after all tests
  const connection = getConnection();
  await connection.close();
});

// Mock external dependencies
global.fetch = jest.fn();

global.console.error = jest.fn();
global.console.warn = jest.fn();

global.process.env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: ':memory:',
  CACHE_SIZE: '1000',
  CACHE_TTL: '3600000',
  PERFORMANCE_MONITOR_INTERVAL: '60000',
};

// Mock database connection
jest.mock('sequelize', () => {
  return {
    default: class Sequelize {
      constructor() {}
      authenticate() {
        return Promise.resolve();
      }
      close() {
        return Promise.resolve();
      }
    },
  };
});

// Mock Redis connection
jest.mock('ioredis', () => {
  return class Redis {
    constructor() {}
    set() {
      return Promise.resolve();
    }
    get() {
      return Promise.resolve();
    }
    del() {
      return Promise.resolve();
    }
    close() {
      return Promise.resolve();
    }
  };
});

// Mock file system operations
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    unlink: jest.fn(),
  },
}));

// Mock crypto operations
jest.mock('crypto', () => ({
  createHash: jest.fn(),
  randomBytes: jest.fn(),
}));
