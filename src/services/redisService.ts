import Redis from 'ioredis';
import { logger } from '../utils/logger';

class RedisService {
  private static instance: RedisService;
  private client: Redis;
  private isConnected: boolean = false;

  private constructor() {
    const options = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      connectTimeout: parseInt(process.env.REDIS_TIMEOUT || '5000'),
      maxConnections: parseInt(process.env.REDIS_MAX_CONNECTIONS || '100'),
      enableTLS: process.env.REDIS_ENABLE_TLS === 'true',
      enableCompression: process.env.REDIS_ENABLE_COMPRESSION === 'true',
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    };

    this.client = new Redis(options);

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis client connected');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      logger.error('Redis client error:', err);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.info('Redis client connection closed');
    });
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public getClient(): Redis {
    return this.client;
  }

  public async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Error getting key ${key} from Redis:`, { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  public async set(key: string, value: string, expiry?: number): Promise<boolean> {
    try {
      if (expiry) {
        await this.client.set(key, value, 'EX', expiry);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`Error setting key ${key} in Redis:`, { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  public async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Error deleting key ${key} from Redis:`, { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking if key ${key} exists in Redis:`, { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  public async flushDb(): Promise<boolean> {
    try {
      await this.client.flushdb();
      return true;
    } catch (error) {
      logger.error('Error flushing Redis database:', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis client disconnected');
    } catch (error) {
      logger.error('Error disconnecting Redis client:', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  public isReady(): boolean {
    return this.isConnected;
  }
}

export const redisService = RedisService.getInstance();
export default redisService;
