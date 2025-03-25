import { RedisManager, RedisMetrics } from '../config/redis';
import { performanceMonitor } from './performanceMonitor';
import { securityAuditService } from './securityAuditService';

export class RedisService {
  private static instance: RedisService;
  private readonly redisManager: RedisManager;
  private metrics: RedisMetrics = {
    operations: {
      get: { count: 0, errors: 0, avgResponseTime: 0 },
      set: { count: 0, errors: 0, avgResponseTime: 0 },
      delete: { count: 0, errors: 0, avgResponseTime: 0 },
      exists: { count: 0, errors: 0, avgResponseTime: 0 },
      ttl: { count: 0, errors: 0, avgResponseTime: 0 },
      flushAll: { count: 0, errors: 0, avgResponseTime: 0 },
      ping: { count: 0, errors: 0, avgResponseTime: 0 }
    },
    connection: {
      status: 'disconnected',
      lastError: null,
      reconnectAttempts: 0
    }
  };

  private constructor() {
    this.redisManager = RedisManager.getInstance();
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.redisManager.redisMetrics = this.metrics;
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private async executeRedisOperation(
    operation: keyof RedisMetrics['operations'],
    key: string,
    value?: any
  ): Promise<any> {
    const startTime = performance.now();
    let result: any;
    let success = false;

    try {
      switch (operation) {
        case 'get':
          result = await this.redisManager.client.get(key);
          success = result !== null;
          break;
        case 'set':
          result = await this.redisManager.client.set(key, value);
          success = result === 'OK';
          break;
        case 'delete':
          result = await this.redisManager.client.del(key);
          success = result > 0;
          break;
        case 'exists':
          result = await this.redisManager.client.exists(key);
          success = result > 0;
          break;
        case 'ttl':
          result = await this.redisManager.client.ttl(key);
          success = result >= 0;
          break;
        case 'flushAll':
          result = await this.redisManager.client.flushAll();
          success = result === 'OK';
          break;
        case 'ping':
          result = await this.redisManager.client.ping();
          success = result === 'PONG';
          break;
        default:
          throw new Error(`Unsupported Redis operation: ${operation}`);
      }

      const responseTime = performance.now() - startTime;
      await this.updateMetrics(operation, key, success, responseTime);
      return result;
    } catch (error) {
      const responseTime = performance.now() - startTime;
      await this.updateMetrics(operation, key, false, responseTime);
      throw error;
    }
  }

  public async get(key: string): Promise<any> {
    return this.executeRedisOperation('get', key);
  }

  public async set(key: string, value: any, ttl?: number): Promise<void> {
    if (ttl) {
      await this.executeRedisOperation('set', key, `${value} ${ttl}`);
    } else {
      await this.executeRedisOperation('set', key, value);
    }
  }

  public async delete(key: string): Promise<void> {
    await this.executeRedisOperation('delete', key);
  }

  public async exists(key: string): Promise<boolean> {
    return this.executeRedisOperation('exists', key);
  }

  public async ttl(key: string): Promise<number> {
    return this.executeRedisOperation('ttl', key);
  }

  public async flushAll(): Promise<void> {
    await this.executeRedisOperation('flushAll', '');
  }

  public async ping(): Promise<boolean> {
    return this.executeRedisOperation('ping', '');
  }

  private async updateMetrics(operation: keyof RedisMetrics['operations'], key: string, success: boolean, responseTime: number): Promise<void> {
    const metrics = this.metrics.operations[operation];
    const newCount = metrics.count + 1;
    const newErrors = success ? metrics.errors : metrics.errors + 1;
    const newAvgResponseTime = (
      (metrics.avgResponseTime * metrics.count + responseTime) / newCount
    );

    this.metrics.operations[operation] = {
      count: newCount,
      errors: newErrors,
      avgResponseTime: newAvgResponseTime
    };

    performanceMonitor.updateMetrics({
      redis: {
        operations: this.metrics.operations,
        connection: this.metrics.connection
      }
    });
  }

  private async handleError(error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Redis error';
    
    securityAuditService.logSystemEvent(
      'redis_error',
      { error: errorMessage },
      'error'
    );

    performanceMonitor.updateMetrics({
      error: {
        type: 'redis',
        message: errorMessage,
        timestamp: new Date().toISOString()
      }
    });

    throw new Error(errorMessage);
  }

  public isConnected(): boolean {
    return this.redisManager.isConnected;
  }

  public async close(): Promise<void> {
    try {
      await this.redisManager.close();
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  public async connect(): Promise<void> {
    try {
      await this.redisManager.connect();
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }
}

export const redisService = RedisService.getInstance();
