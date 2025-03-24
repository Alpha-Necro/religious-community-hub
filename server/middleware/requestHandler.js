const { performanceMonitor } = require('../services/performanceMonitor');
const { cachingService } = require('../services/cachingService');
const { databaseService } = require('../services/databaseService');
const crypto = require('crypto');
const compression = require('compression');

const requestHandler = {
  initialize: async () => {
    try {
      // Initialize request optimization
      this.optimization = {
        compression: {
          enabled: process.env.REQUEST_COMPRESSION === 'true',
          level: parseInt(process.env.REQUEST_COMPRESSION_LEVEL) || 6
        },
        caching: {
          enabled: process.env.REQUEST_CACHING === 'true',
          region: 'requests',
          ttl: process.env.REQUEST_CACHE_TTL || 3600000 // 1 hour
        },
        rateLimiting: {
          enabled: process.env.REQUEST_RATE_LIMITING === 'true',
          maxRequests: parseInt(process.env.REQUEST_RATE_LIMIT) || 100,
          windowMs: parseInt(process.env.REQUEST_RATE_WINDOW) || 60000 // 1 minute
        },
        validation: {
          enabled: process.env.REQUEST_VALIDATION === 'true',
          strict: process.env.REQUEST_VALIDATION_STRICT === 'true'
        }
      };

      // Initialize request metrics
      this.metrics = {
        total: 0,
        cached: 0,
        compressed: 0,
        rateLimited: 0,
        validationErrors: 0,
        endpoints: new Map(),
        methods: new Map(),
        responseTimes: new Map()
      };

      // Initialize monitoring
      this.monitoringInterval = setInterval(() => {
        this.monitorRequests();
      }, process.env.REQUEST_MONITOR_INTERVAL || 60000); // 1 minute

      return true;
    } catch (error) {
      throw error;
    }
  },

  handleRequest: async (req, res, next) => {
    try {
      // Start request timer
      const startTime = Date.now();

      // Apply rate limiting
      if (this.optimization.rateLimiting.enabled) {
        const rateLimitKey = this.generateRateLimitKey(req);
        const rateLimitStats = await this.checkRateLimit(rateLimitKey);
        if (!rateLimitStats.allowed) {
          this.metrics.rateLimited++;
          return res.status(429).json({
            error: 'Too many requests',
            reset: rateLimitStats.reset
          });
        }
      }

      // Apply request validation
      if (this.optimization.validation.enabled) {
        const validationErrors = await this.validateRequest(req);
        if (validationErrors.length > 0) {
          this.metrics.validationErrors++;
          return res.status(400).json({
            error: 'Validation failed',
            errors: validationErrors
          });
        }
      }

      // Check cache
      if (this.optimization.caching.enabled) {
        const cacheKey = this.generateCacheKey(req);
        const cachedResponse = await cachingService.get(this.optimization.caching.region, cacheKey);
        if (cachedResponse) {
          this.metrics.cached++;
          performanceMonitor.trackCacheOperation(this.optimization.caching.region, 'hit', true);
          return res.json(cachedResponse);
        }
      }

      // Apply request compression
      if (this.optimization.compression.enabled && req.method === 'POST') {
        req.body = await this.decompressRequest(req.body);
        this.metrics.compressed++;
      }

      // Track request metrics
      this.trackRequest(req, startTime);

      // Proceed with request
      next();
    } catch (error) {
      next(error);
    }
  },

  handleResponse: async (req, res, next) => {
    try {
      // Track response time
      const duration = Date.now() - req.startTime;
      this.metrics.responseTimes.set(req.url, duration);

      // Cache response if enabled
      if (this.optimization.caching.enabled && res.statusCode === 200) {
        const cacheKey = this.generateCacheKey(req);
        await cachingService.set(this.optimization.caching.region, cacheKey, res.body, this.optimization.caching.ttl);
        performanceMonitor.trackCacheOperation(this.optimization.caching.region, 'set', true);
      }

      // Apply response compression
      if (this.optimization.compression.enabled && res.statusCode === 200) {
        res.body = await this.compressResponse(res.body);
        this.metrics.compressed++;
      }

      next();
    } catch (error) {
      next(error);
    }
  },

  generateRateLimitKey: (req) => {
    return `${req.ip}:${req.method}:${req.url}`;
  },

  checkRateLimit: async (key) => {
    try {
      const stats = await cachingService.get('rate_limit', key);
      if (!stats) {
        await cachingService.set('rate_limit', key, {
          count: 1,
          timestamp: Date.now()
        }, this.optimization.rateLimiting.windowMs);
        return { allowed: true };
      }

      const timeDiff = Date.now() - stats.timestamp;
      if (timeDiff > this.optimization.rateLimiting.windowMs) {
        await cachingService.set('rate_limit', key, {
          count: 1,
          timestamp: Date.now()
        }, this.optimization.rateLimiting.windowMs);
        return { allowed: true };
      }

      if (stats.count >= this.optimization.rateLimiting.maxRequests) {
        return {
          allowed: false,
          reset: stats.timestamp + this.optimization.rateLimiting.windowMs - Date.now()
        };
      }

      stats.count++;
      await cachingService.set('rate_limit', key, stats, this.optimization.rateLimiting.windowMs);
      return { allowed: true };
    } catch (error) {
      throw error;
    }
  },

  validateRequest: async (req) => {
    try {
      // Implement request validation
      const errors = [];
      
      // Validate content type
      if (!req.headers['content-type']?.includes('application/json')) {
        errors.push('Invalid content type');
      }

      // Validate body size
      if (req.body && Buffer.byteLength(JSON.stringify(req.body)) > 1024 * 1024) { // 1MB limit
        errors.push('Request body too large');
      }

      return errors;
    } catch (error) {
      throw error;
    }
  },

  generateCacheKey: (req) => {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify({
      method: req.method,
      url: req.url,
      query: req.query,
      body: req.body,
      timestamp: Date.now() // Include timestamp for cache invalidation
    }));
    return `request:${hash.digest('hex')}`;
  },

  compressRequest: async (body) => {
    try {
      const compressed = await compression.compress(JSON.stringify(body), {
        level: this.optimization.compression.level
      });
      return JSON.parse(compressed);
    } catch (error) {
      throw error;
    }
  },

  decompressRequest: async (body) => {
    try {
      const decompressed = await compression.decompress(JSON.stringify(body));
      return JSON.parse(decompressed);
    } catch (error) {
      throw error;
    }
  },

  compressResponse: async (body) => {
    try {
      const compressed = await compression.compress(JSON.stringify(body), {
        level: this.optimization.compression.level
      });
      return JSON.parse(compressed);
    } catch (error) {
      throw error;
    }
  },

  trackRequest: (req, startTime) => {
    try {
      // Track endpoint metrics
      let endpointMetrics = this.metrics.endpoints.get(req.url);
      if (!endpointMetrics) {
        endpointMetrics = {
          count: 0,
          duration: 0,
          maxDuration: 0,
          minDuration: Infinity
        };
        this.metrics.endpoints.set(req.url, endpointMetrics);
      }
      endpointMetrics.count++;

      // Track method metrics
      let methodMetrics = this.metrics.methods.get(req.method);
      if (!methodMetrics) {
        methodMetrics = {
          count: 0,
          duration: 0,
          maxDuration: 0,
          minDuration: Infinity
        };
        this.metrics.methods.set(req.method, methodMetrics);
      }
      methodMetrics.count++;

      this.metrics.total++;
    } catch (error) {
      throw error;
    }
  },

  monitorRequests: () => {
    try {
      // Check request distribution
      const endpointDistribution = Array.from(this.metrics.endpoints.entries())
        .reduce((acc, [endpoint, metrics]) => {
          acc[endpoint] = (metrics.count / this.metrics.total) * 100;
          return acc;
        }, {});

      const methodDistribution = Array.from(this.metrics.methods.entries())
        .reduce((acc, [method, metrics]) => {
          acc[method] = (metrics.count / this.metrics.total) * 100;
          return acc;
        }, {});

      // Check response times
      const slowEndpoints = Array.from(this.metrics.responseTimes.entries())
        .filter(([endpoint, duration]) => duration >= 1000) // 1 second
        .sort((a, b) => b[1] - a[1]);

      if (slowEndpoints.length > 0) {
        performanceMonitor.alerts.api = true;
        performanceMonitor.optimizations.api.push(`Detected slow endpoints: ${slowEndpoints.length}`);
      }

      // Generate recommendations
      if (performanceMonitor.alerts.api) {
        performanceMonitor.optimizations.api.push(`Endpoint distribution: ${JSON.stringify(endpointDistribution)}`);
        performanceMonitor.optimizations.api.push(`Method distribution: ${JSON.stringify(methodDistribution)}`);
      }
    } catch (error) {
      throw error;
    }
  },

  getRequestStatistics: () => ({
    ...this.metrics,
    endpointDistribution: Array.from(this.metrics.endpoints.entries())
      .reduce((acc, [endpoint, metrics]) => {
        acc[endpoint] = (metrics.count / this.metrics.total) * 100;
        return acc;
      }, {}),
    methodDistribution: Array.from(this.metrics.methods.entries())
      .reduce((acc, [method, metrics]) => {
        acc[method] = (metrics.count / this.metrics.total) * 100;
        return acc;
      }, {}),
    responseTimeDistribution: Array.from(this.metrics.responseTimes.entries())
      .sort((a, b) => b[1] - a[1])
  })
};

module.exports = requestHandler;
