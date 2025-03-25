import { RedisServiceMock } from './redisService';

export class CacheServiceMock {
  private redisService: RedisServiceMock;

  constructor(redisService: RedisServiceMock) {
    this.redisService = redisService;
  }

  public async set<T>(key: string, value: T, ttl: number = 3600): Promise<boolean> {
    const stringValue = JSON.stringify(value);
    return await this.redisService.set(key, stringValue, ttl);
  }

  public async get<T>(key: string): Promise<T | null> {
    const value = await this.redisService.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  public async delete(key: string): Promise<boolean> {
    return await this.redisService.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    return await this.redisService.exists(key);
  }

  public async clear(): Promise<boolean> {
    return await this.redisService.flushDb();
  }
}

export const cacheServiceMock = new CacheServiceMock(redisServiceMock);

// Jest mock implementation
jest.mock('../services/cacheService', () => ({
  __esModule: true,
  default: cacheServiceMock,
}));
