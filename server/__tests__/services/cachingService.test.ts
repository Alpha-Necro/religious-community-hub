import { cachingService } from '../services/cachingService';

describe('Caching Service', () => {
  beforeEach(() => {
    cachingService.clear('test');
  });

  it('should initialize successfully', async () => {
    await cachingService.initialize();
    expect(cachingService.isInitialized).toBe(true);
  });

  it('should set and get cache items', async () => {
    const key = 'test-key';
    const value = { data: 'test' };
    
    await cachingService.set(key, value, 'test');
    const cachedValue = await cachingService.get(key, 'test');
    
    expect(cachedValue).toEqual(value);
  });

  it('should handle cache expiration', async () => {
    const key = 'expire-key';
    const value = { data: 'expire' };
    
    await cachingService.set(key, value, 'test', 100); // 100ms TTL
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const cachedValue = await cachingService.get(key, 'test');
    expect(cachedValue).toBeNull();
  });

  it('should clear cache region', async () => {
    const key1 = 'region-key1';
    const key2 = 'region-key2';
    
    await cachingService.set(key1, { data: 'region1' }, 'test');
    await cachingService.set(key2, { data: 'region2' }, 'test');
    
    await cachingService.clear('test');
    
    const value1 = await cachingService.get(key1, 'test');
    const value2 = await cachingService.get(key2, 'test');
    
    expect(value1).toBeNull();
    expect(value2).toBeNull();
  });

  it('should track cache metrics', async () => {
    const key = 'metrics-key';
    const value = { data: 'metrics' };
    
    await cachingService.set(key, value, 'test');
    await cachingService.get(key, 'test');
    
    const metrics = cachingService.getMetrics();
    expect(metrics).toHaveProperty('hits');
    expect(metrics).toHaveProperty('misses');
    expect(metrics).toHaveProperty('size');
  });

  it('should handle cache errors gracefully', async () => {
    const key = 'error-key';
    
    // Mock Redis error
    const originalSet = cachingService.redis.set;
    cachingService.redis.set = jest.fn().mockRejectedValue(new Error('Redis error'));
    
    await expect(cachingService.set(key, { data: 'error' }, 'test'))
      .rejects
      .toThrow('Cache error: Redis error');
    
    // Restore original method
    cachingService.redis.set = originalSet;
  });

  it('should clean up resources', async () => {
    await cachingService.cleanup();
    expect(cachingService.isInitialized).toBe(false);
  });
});
