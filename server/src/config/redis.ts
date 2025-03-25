import { createClient, RedisClientType, RedisError } from 'redis';
import { getEnvironment } from './environment';
import { performanceMonitor } from '../services/performanceMonitor';
import { securityAuditService } from '../services/securityAuditService';

export interface Metrics {
  redis: {
    connection: {
      status: 'connected' | 'disconnected' | 'error' | 'reconnecting';
      lastError: string | null;
      reconnectAttempts: number;
      latency: number;
    };
    operations: Record<RedisOperation, OperationMetrics>;
    circuitBreaker: {
      state: 'closed' | 'open' | 'half-open';
      failureCount: number;
      lastFailure: Date | null;
      lastSuccess: Date | null;
      resetTimeout: number;
    };
  };
}

export interface OperationMetrics {
  count: number;
  errors: number;
  avgResponseTime: number;
  success: boolean;
}

export type RedisOperation = keyof Metrics['redis']['operations'];

export class RedisManager {
  private static instance: RedisManager;
  public client: RedisClientType;
  public isConnected: boolean = false;
  public connectionStatus: 'disconnected' | 'connected' | 'error' | 'reconnecting' = 'disconnected';
  public lastError: string | null = null;
  public reconnectAttempts: number = 0;
  public redisMetrics: Metrics = {
    redis: {
      operations: {
        get: { count: 0, errors: 0, avgResponseTime: 0, success: true },
        set: { count: 0, errors: 0, avgResponseTime: 0, success: true },
        delete: { count: 0, errors: 0, avgResponseTime: 0, success: true },
        exists: { count: 0, errors: 0, avgResponseTime: 0, success: true },
        ttl: { count: 0, errors: 0, avgResponseTime: 0, success: true },
        flushAll: { count: 0, errors: 0, avgResponseTime: 0, success: true },
        ping: { count: 0, errors: 0, avgResponseTime: 0, success: true }
      },
      connection: {
        status: 'disconnected',
        lastError: null,
        reconnectAttempts: 0,
        latency: 0
      },
      circuitBreaker: {
        state: 'closed',
        failureCount: 0,
        lastFailure: null,
        lastSuccess: null,
        resetTimeout: 30000
      }
    }
  };
  private latency: number = 0;

  private constructor() {
    this.client = createClient({
      url: getEnvironment().REDIS_URL
    });
    
    // Initialize connection handlers
    this.initializeConnectionHandlers();
  }

  private initializeConnectionHandlers(): void {
    this.client.on('error', async (error: RedisError) => {
      await this.handleConnectionStatus('error', error);
    });

    this.client.on('connect', async () => {
      await this.handleConnectionStatus('connected');
    });

    this.client.on('ready', async () => {
      await this.handleConnectionStatus('connected');
    });

    this.client.on('end', async () => {
      await this.handleConnectionStatus('disconnected');
    });

    this.client.on('reconnecting', async () => {
      await this.handleConnectionStatus('reconnecting');
    });
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  private async handleConnectionStatus(
    status: 'connected' | 'disconnected' | 'error' | 'reconnecting',
    error?: RedisError
  ): Promise<void> {
    try {
      await this.updateLatency();
      const metrics: Partial<Metrics> = {
        redis: {
          connection: {
            status,
            lastError: status === 'error' ? error?.message || this.lastError || '' : null,
            reconnectAttempts: status === 'error' ? (this.reconnectAttempts || 0) + 1 : 0,
            latency: this.latency
          },
          operations: this.redisMetrics.redis.operations,
          circuitBreaker: {
            state: 'closed',
            failureCount: 0,
            lastFailure: null,
            lastSuccess: null,
            resetTimeout: 30000
          }
        }
      };
      
      // Update metrics
      await this.updateMetrics(metrics);
      
      // Log the status change
      securityAuditService.logSystemEvent(
        status === 'connected' ? 'redis_connected' : 
        status === 'disconnected' ? 'redis_disconnected' : 
        status === 'reconnecting' ? 'redis_reconnecting' : 'redis_error',
        { status, lastError: metrics.redis.connection.lastError },
        status === 'error' ? 'error' : 'info'
      );

    } catch (error: unknown) {
      if (error instanceof Error) {
        await this.handleError(error);
      } else {
        await this.handleError(new Error('Unknown error in handleConnectionStatus'));
      }
    }
  }

  public async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
        await this.handleConnectionStatus('connected');
        this.isConnected = true;
      } catch (error: unknown) {
        if (error instanceof Error) {
          await this.handleError(error);
        } else {
          await this.handleError(new Error('Unknown error in connect'));
        }
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.client.disconnect();
        await this.handleConnectionStatus('disconnected');
        this.isConnected = false;
      } catch (error: unknown) {
        if (error instanceof Error) {
          await this.handleError(error);
        } else {
          await this.handleError(new Error('Unknown error in disconnect'));
        }
      }
    }
  }

  public async trackOperation(
    operation: RedisOperation,
    key: string,
    success: boolean,
    responseTime: number
  ): Promise<void> {
    try {
      const metrics = this.redisMetrics.redis.operations[operation];
      if (!metrics) {
        throw new Error(`Invalid Redis operation: ${operation}`);
      }

      metrics.count++;
      metrics.avgResponseTime = (metrics.avgResponseTime * (metrics.count - 1) + responseTime) / metrics.count;
      metrics.success = success;
      if (!success) {
        metrics.errors++;
      }

      // Update metrics
      this.redisMetrics.redis.operations[operation] = metrics;

    } catch (error: unknown) {
      if (error instanceof Error) {
        await this.handleError(error);
      } else {
        await this.handleError(new Error('Unknown error in trackOperation'));
      }
    }
  }

  private async updateLatency(): Promise<void> {
    try {
      const startTime = performance.now();
      await this.client.ping();
      this.latency = performance.now() - startTime;
    } catch (error: unknown) {
      if (error instanceof Error) {
        await this.handleError(error);
      } else {
        await this.handleError(new Error('Unknown error in updateLatency'));
      }
    }
  }

  private async updateMetrics(metrics: Partial<Metrics>): Promise<void> {
    try {
      await performanceMonitor.updateMetrics(metrics);
    } catch (error: unknown) {
      if (error instanceof Error) {
        await this.handleError(error);
      } else {
        await this.handleError(new Error('Unknown error in updateMetrics'));
      }
    }
  }

  private async handleError(error: Error): Promise<void> {
    try {
      this.lastError = error.message;
      this.connectionStatus = 'error';
      this.reconnectAttempts++;

      // Update circuit breaker state
      const circuitBreaker = this.redisMetrics.redis.circuitBreaker;
      circuitBreaker.state = 'open';
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailure = new Date();
      circuitBreaker.lastSuccess = null;

      // Update metrics
      await this.updateMetrics({
        redis: {
          circuitBreaker
        }
      });

      // Log the error
      securityAuditService.logSystemEvent(
        'redis_error',
        { error: error.message },
        'error'
      );

    } catch (error: unknown) {
      console.error('Failed to handle Redis error:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Add type-safe Redis operations
  public async get(key: string): Promise<string | null> {
    const startTime = performance.now();
    try {
      const result = await this.client.get(key);
      await this.trackOperation('get', key, result !== null, performance.now() - startTime);
      return result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        await this.handleError(error);
        await this.trackOperation('get', key, false, performance.now() - startTime);
      } else {
        await this.handleError(new Error('Unknown error in get'));
        await this.trackOperation('get', key, false, performance.now() - startTime);
      }
      return null;
    }
  }

  public async set(key: string, value: string, ttl?: number): Promise<void> {
    const startTime = performance.now();
    try {
      if (ttl) {
        await this.client.set(key, value, { EX: ttl });
      } else {
        await this.client.set(key, value);
      }
      await this.trackOperation('set', key, true, performance.now() - startTime);
    } catch (error: unknown) {
      if (error instanceof Error) {
        await this.handleError(error);
        await this.trackOperation('set', key, false, performance.now() - startTime);
      } else {
        await this.handleError(new Error('Unknown error in set'));
        await this.trackOperation('set', key, false, performance.now() - startTime);
      }
    }
  }

  public async delete(key: string): Promise<void> {
    const startTime = performance.now();
    try {
      await this.client.del(key);
      await this.trackOperation('delete', key, true, performance.now() - startTime);
    } catch (error: unknown) {
      if (error instanceof Error) {
        await this.handleError(error);
        await this.trackOperation('delete', key, false, performance.now() - startTime);
      } else {
        await this.handleError(new Error('Unknown error in delete'));
        await this.trackOperation('delete', key, false, performance.now() - startTime);
      }
    }
  }

  public async exists(key: string): Promise<boolean> {
    const startTime = performance.now();
    try {
      const exists = await this.client.exists(key);
      await this.trackOperation('exists', key, true, performance.now() - startTime);
      return exists > 0;
    } catch (error: unknown) {
      if (error instanceof Error) {
        await this.handleError(error);
        await this.trackOperation('exists', key, false, performance.now() - startTime);
      } else {
        await this.handleError(new Error('Unknown error in exists'));
        await this.trackOperation('exists', key, false, performance.now() - startTime);
      }
      return false;
    }
  }

  public async ttl(key: string): Promise<number> {
    const startTime = performance.now();
    try {
      const ttl = await this.client.ttl(key);
      await this.trackOperation('ttl', key, true, performance.now() - startTime);
      return ttl;
    } catch (error: unknown) {
      if (error instanceof Error) {
        await this.handleError(error);
        await this.trackOperation('ttl', key, false, performance.now() - startTime);
      } else {
        await this.handleError(new Error('Unknown error in ttl'));
        await this.trackOperation('ttl', key, false, performance.now() - startTime);
      }
      return -2; // -2 means key does not exist
    }
  }

  public async flushAll(): Promise<void> {
    const startTime = performance.now();
    try {
      await this.client.flushAll();
      await this.trackOperation('flushAll', 'all', true, performance.now() - startTime);
    } catch (error: unknown) {
      if (error instanceof Error) {
        await this.handleError(error);
        await this.trackOperation('flushAll', 'all', false, performance.now() - startTime);
      } else {
        await this.handleError(new Error('Unknown error in flushAll'));
        await this.trackOperation('flushAll', 'all', false, performance.now() - startTime);
      }
    }
  }

  public async ping(): Promise<string> {
    const startTime = performance.now();
    try {
      const result = await this.client.ping();
      await this.trackOperation('ping', 'ping', true, performance.now() - startTime);
      return result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        await this.handleError(error);
        await this.trackOperation('ping', 'ping', false, performance.now() - startTime);
      } else {
        await this.handleError(new Error('Unknown error in ping'));
        await this.trackOperation('ping', 'ping', false, performance.now() - startTime);
      }
      return 'PONG';
    }
  }
}

export const redisManager = RedisManager.getInstance();
