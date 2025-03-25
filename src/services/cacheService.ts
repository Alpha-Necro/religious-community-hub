import redisService from './redisService';
import { logger } from '../utils/logger';

class CacheService {
  private static instance: CacheService;
  private defaultTTL: number = 3600; // 1 hour in seconds

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Set a value in the cache
   * @param key - The cache key
   * @param value - The value to cache (will be JSON stringified)
   * @param ttl - Time to live in seconds (optional, defaults to 1 hour)
   */
  public async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<boolean> {
    try {
      const stringValue = JSON.stringify(value);
      return await redisService.set(key, stringValue, ttl);
    } catch (error) {
      logger.error(`Error setting cache for key ${key}:`, { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Get a value from the cache
   * @param key - The cache key
   * @returns The cached value or null if not found
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisService.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Error getting cache for key ${key}:`, { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Delete a value from the cache
   * @param key - The cache key
   */
  public async delete(key: string): Promise<boolean> {
    try {
      return await redisService.del(key);
    } catch (error) {
      logger.error(`Error deleting cache for key ${key}:`, { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Check if a key exists in the cache
   * @param key - The cache key
   */
  public async exists(key: string): Promise<boolean> {
    try {
      return await redisService.exists(key);
    } catch (error) {
      logger.error(`Error checking if key ${key} exists in cache:`, { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Clear the entire cache
   */
  public async clear(): Promise<boolean> {
    try {
      return await redisService.flushDb();
    } catch (error) {
      logger.error('Error clearing cache:', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }
}

export const cacheService = CacheService.getInstance();
export default cacheService;
