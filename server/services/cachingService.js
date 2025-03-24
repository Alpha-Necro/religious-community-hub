const { performanceMonitor } = require('./performanceMonitor');
const crypto = require('crypto');
const LRUCache = require('lru-cache');

const cachingService = {
  cache: new LRUCache({
    max: process.env.CACHE_SIZE || 10000, // Maximum number of items
    maxAge: process.env.CACHE_TTL || 3600000, // 1 hour in ms
    dispose: (key, value) => {
      performanceMonitor.trackCacheOperation('eviction', 'eviction', true);
    }
  }),

  initialize: async () => {
    try {
      // Initialize cache regions
      this.regions = {
        users: this.cache.createRegion('users', {
          max: process.env.CACHE_SIZE_USERS || 5000,
          maxAge: process.env.CACHE_TTL_USERS || 3600000
        }),
        sessions: this.cache.createRegion('sessions', {
          max: process.env.CACHE_SIZE_SESSIONS || 2000,
          maxAge: process.env.CACHE_TTL_SESSIONS || 1800000
        }),
        content: this.cache.createRegion('content', {
          max: process.env.CACHE_SIZE_CONTENT || 10000,
          maxAge: process.env.CACHE_TTL_CONTENT || 86400000
        }),
        preferences: this.cache.createRegion('preferences', {
          max: process.env.CACHE_SIZE_PREFERENCES || 3000,
          maxAge: process.env.CACHE_TTL_PREFERENCES || 3600000
        })
      };

      // Initialize cache metrics
      this.metrics = {
        hits: 0,
        misses: 0,
        evictions: 0,
        size: 0,
        max: this.cache.max,
        hitRate: 0,
        missRate: 0,
        regions: {
          users: { hits: 0, misses: 0, size: 0 },
          sessions: { hits: 0, misses: 0, size: 0 },
          content: { hits: 0, misses: 0, size: 0 },
          preferences: { hits: 0, misses: 0, size: 0 }
        }
      };

      // Start cache monitoring
      this.monitoringInterval = setInterval(() => {
        this.monitorCache();
      }, process.env.CACHE_MONITOR_INTERVAL || 60000); // 1 minute

      return true;
    } catch (error) {
      throw error;
    }
  },

  createRegion: (name, options) => {
    return new LRUCache({
      ...options,
      dispose: (key, value) => {
        performanceMonitor.trackCacheOperation(name, 'eviction', true);
      }
    });
  },

  get: async (region, key) => {
    try {
      const regionCache = this.regions[region];
      if (!regionCache) {
        throw new Error(`Invalid cache region: ${region}`);
      }

      const value = regionCache.get(key);
      if (value) {
        this.metrics.hits++;
        this.metrics.regions[region].hits++;
        performanceMonitor.trackCacheOperation(region, 'hit', true);
        return value;
      }

      this.metrics.misses++;
      this.metrics.regions[region].misses++;
      performanceMonitor.trackCacheOperation(region, 'miss', true);
      return null;
    } catch (error) {
      throw error;
    }
  },

  set: async (region, key, value, ttl) => {
    try {
      const regionCache = this.regions[region];
      if (!regionCache) {
        throw new Error(`Invalid cache region: ${region}`);
      }

      regionCache.set(key, value, ttl);
      this.metrics.size++;
      this.metrics.regions[region].size++;
      performanceMonitor.trackCacheOperation(region, 'set', true);
      return true;
    } catch (error) {
      throw error;
    }
  },

  delete: async (region, key) => {
    try {
      const regionCache = this.regions[region];
      if (!regionCache) {
        throw new Error(`Invalid cache region: ${region}`);
      }

      regionCache.delete(key);
      this.metrics.size--;
      this.metrics.regions[region].size--;
      performanceMonitor.trackCacheOperation(region, 'delete', true);
      return true;
    } catch (error) {
      throw error;
    }
  },

  clear: async (region) => {
    try {
      const regionCache = this.regions[region];
      if (!regionCache) {
        throw new Error(`Invalid cache region: ${region}`);
      }

      regionCache.reset();
      this.metrics.size = 0;
      this.metrics.regions[region].size = 0;
      performanceMonitor.trackCacheOperation(region, 'clear', true);
      return true;
    } catch (error) {
      throw error;
    }
  },

  getCacheStatistics: () => ({
    ...this.metrics,
    hitRate: (this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100,
    missRate: (this.metrics.misses / (this.metrics.hits + this.metrics.misses)) * 100,
    regions: Object.entries(this.metrics.regions).reduce((acc, [region, stats]) => {
      acc[region] = {
        ...stats,
        hitRate: (stats.hits / (stats.hits + stats.misses)) * 100,
        missRate: (stats.misses / (stats.hits + stats.misses)) * 100
      };
      return acc;
    }, {})
  }),

  monitorCache: () => {
    const stats = this.getCacheStatistics();

    // Check cache hit ratio
    if (stats.hitRate < 70) {
      performanceMonitor.alerts.cache = true;
      performanceMonitor.optimizations.cache.push(`Low cache hit rate: ${stats.hitRate.toFixed(2)}%`);
    }

    // Check memory usage
    const memoryUsage = (stats.size / stats.max) * 100;
    if (memoryUsage > 90) {
      performanceMonitor.alerts.cache = true;
      performanceMonitor.optimizations.cache.push(`High cache memory usage: ${memoryUsage.toFixed(2)}%`);
    }

    // Check region-specific metrics
    Object.entries(stats.regions).forEach(([region, regionStats]) => {
      if (regionStats.hitRate < 70) {
        performanceMonitor.alerts.cache = true;
        performanceMonitor.optimizations.cache.push(`Low hit rate in ${region} region: ${regionStats.hitRate.toFixed(2)}%`);
      }

      if (regionStats.size > regionStats.max * 0.9) {
        performanceMonitor.alerts.cache = true;
        performanceMonitor.optimizations.cache.push(`High memory usage in ${region} region: ${regionStats.size}/${regionStats.max}`);
      }
    });
  }
};

module.exports = cachingService;
