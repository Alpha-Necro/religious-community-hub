import { redisManager } from '../config/redis';
import { performanceMonitor } from './performanceMonitor';
import { securityAlertService } from './securityAlertService';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class CacheService {
  private static instance: CacheService;
  private readonly defaultTtl = 3600; // 1 hour
  private readonly cachePrefix = 'cache:';

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private generateKey(key: string, options: CacheOptions = {}): string {
    return `${options.prefix || this.cachePrefix}${key}`;
  }

  public async set(
    key: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const startTime = performance.now();
      const cacheKey = this.generateKey(key, options);
      
      await redisManager.getClient().setEx(
        cacheKey,
        options.ttl || this.defaultTtl,
        JSON.stringify(value)
      );

      const responseTime = performance.now() - startTime;
      performanceMonitor.updateMetrics({
        cache: {
          operation: 'set',
          responseTime,
          status: 'success'
        }
      });
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  public async get(key: string, options: CacheOptions = {}): Promise<any | null> {
    try {
      const startTime = performance.now();
      const cacheKey = this.generateKey(key, options);
      
      const data = await redisManager.getClient().get(cacheKey);
      const responseTime = performance.now() - startTime;

      performanceMonitor.updateMetrics({
        cache: {
          operation: 'get',
          responseTime,
          status: data ? 'success' : 'miss'
        }
      });

      return data ? JSON.parse(data) : null;
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  public async delete(key: string, options: CacheOptions = {}): Promise<void> {
    try {
      const startTime = performance.now();
      const cacheKey = this.generateKey(key, options);
      
      await redisManager.getClient().del(cacheKey);
      const responseTime = performance.now() - startTime;

      performanceMonitor.updateMetrics({
        cache: {
          operation: 'delete',
          responseTime,
          status: 'success'
        }
      });
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  private async handleError(error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown cache error';
    
    await securityAlertService.sendAlert(
      'Cache Error',
      errorMessage
    );

    performanceMonitor.updateMetrics({
      cache: {
        status: 'error',
        responseTime: 0
      }
    });

    throw new Error(`Cache error: ${errorMessage}`);
  }
}

export const cacheService = CacheService.getInstance();
