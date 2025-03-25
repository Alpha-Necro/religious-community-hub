import redisService from '../services/redisService';
import { logger } from './logger';

/**
 * Performs a health check on the Redis connection
 * @returns Promise<boolean> - True if Redis is connected and working, false otherwise
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    // Check if Redis client is ready
    if (!redisService.isReady()) {
      logger.error('Redis health check failed: Client not connected');
      return false;
    }

    // Perform a simple ping-pong test
    const testKey = 'health:check:' + Date.now();
    const testValue = 'ping';
    
    // Set a test value
    const setResult = await redisService.set(testKey, testValue, 10); // 10 seconds expiry
    if (!setResult) {
      logger.error('Redis health check failed: Could not set test value');
      return false;
    }
    
    // Get the test value
    const getValue = await redisService.get(testKey);
    if (getValue !== testValue) {
      logger.error(`Redis health check failed: Expected '${testValue}' but got '${getValue}'`);
      return false;
    }
    
    // Delete the test value
    await redisService.del(testKey);
    
    logger.info('Redis health check passed');
    return true;
  } catch (error) {
    logger.error('Redis health check failed with error:', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Initializes Redis and performs a health check
 * @returns Promise<boolean> - True if Redis is successfully initialized, false otherwise
 */
export async function initializeRedis(): Promise<boolean> {
  try {
    // Wait for Redis to connect
    logger.info('Initializing Redis connection...');
    
    // Give Redis some time to connect
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Perform health check
    const isHealthy = await checkRedisHealth();
    
    if (isHealthy) {
      logger.info('Redis initialized successfully');
      return true;
    } else {
      logger.error('Redis initialization failed');
      return false;
    }
  } catch (error) {
    logger.error('Error initializing Redis:', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
