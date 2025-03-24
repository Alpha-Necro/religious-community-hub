const { cachingService } = require('./cachingService');
const { performanceMonitor } = require('./performanceMonitor');
const { Op } = require('sequelize');
const User = require('../models/User');

const databaseService = {
  initialize: async () => {
    try {
      // Initialize query optimization
      this.queryOptimizer = {
        enabled: process.env.QUERY_OPTIMIZATION === 'true',
        cacheEnabled: process.env.QUERY_CACHE_ENABLED === 'true',
        cacheRegion: 'queries',
        cacheTTL: process.env.QUERY_CACHE_TTL || 3600000, // 1 hour
        optimizationLevel: process.env.QUERY_OPTIMIZATION_LEVEL || 'MEDIUM'
      };

      // Initialize query metrics
      this.queryMetrics = {
        total: 0,
        cached: 0,
        optimized: 0,
        slowQueries: new Map(),
        queryTypes: new Map(),
        tables: new Map()
      };

      // Initialize monitoring
      this.monitoringInterval = setInterval(() => {
        this.monitorQueries();
      }, process.env.QUERY_MONITOR_INTERVAL || 60000); // 1 minute

      return true;
    } catch (error) {
      throw error;
    }
  },

  optimizeQuery: async (query, options = {}) => {
    try {
      // Check if query should be cached
      if (this.queryOptimizer.cacheEnabled && options.cacheable !== false) {
        const cacheKey = this.generateCacheKey(query, options);
        const cachedResult = await cachingService.get(this.queryOptimizer.cacheRegion, cacheKey);
        if (cachedResult) {
          this.queryMetrics.cached++;
          performanceMonitor.trackCacheOperation(this.queryOptimizer.cacheRegion, 'hit', true);
          return cachedResult;
        }
      }

      // Optimize query based on level
      switch (this.queryOptimizer.optimizationLevel) {
        case 'HIGH':
          query = await this.applyHighOptimization(query, options);
          break;
        case 'MEDIUM':
          query = await this.applyMediumOptimization(query, options);
          break;
        case 'LOW':
          query = await this.applyLowOptimization(query, options);
          break;
      }

      // Track query metrics
      this.trackQuery(query, options);

      // Execute query
      const startTime = Date.now();
      const result = await query;
      const duration = Date.now() - startTime;

      // Cache result if enabled
      if (this.queryOptimizer.cacheEnabled && options.cacheable !== false) {
        const cacheKey = this.generateCacheKey(query, options);
        await cachingService.set(this.queryOptimizer.cacheRegion, cacheKey, result, this.queryOptimizer.cacheTTL);
        performanceMonitor.trackCacheOperation(this.queryOptimizer.cacheRegion, 'set', true);
      }

      // Track performance
      performanceMonitor.trackDatabaseQuery(
        options.type || 'SELECT',
        options.table || 'unknown',
        duration,
        true
      );

      return result;
    } catch (error) {
      performanceMonitor.trackDatabaseQuery(
        options.type || 'SELECT',
        options.table || 'unknown',
        Date.now() - startTime,
        false
      );
      throw error;
    }
  },

  generateCacheKey: (query, options) => {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify({
      query: query.toString(),
      options: options,
      timestamp: Date.now() // Include timestamp for cache invalidation
    }));
    return `query:${hash.digest('hex')}`;
  },

  applyHighOptimization: async (query, options) => {
    try {
      // Add indexes if needed
      if (options.indexes) {
        await this.createIndexes(options.indexes);
      }

      // Use batch operations where possible
      if (options.batchSize) {
        query = this.applyBatchOptimization(query, options.batchSize);
      }

      // Use proper joins
      if (options.joins) {
        query = this.applyJoinOptimization(query, options.joins);
      }

      // Add query hints
      if (options.hints) {
        query = this.applyQueryHints(query, options.hints);
      }

      return query;
    } catch (error) {
      throw error;
    }
  },

  applyMediumOptimization: async (query, options) => {
    try {
      // Use proper indexes
      if (options.indexes) {
        await this.createIndexes(options.indexes);
      }

      // Use batch operations where possible
      if (options.batchSize) {
        query = this.applyBatchOptimization(query, options.batchSize);
      }

      return query;
    } catch (error) {
      throw error;
    }
  },

  applyLowOptimization: async (query, options) => {
    try {
      // Use proper indexes
      if (options.indexes) {
        await this.createIndexes(options.indexes);
      }

      return query;
    } catch (error) {
      throw error;
    }
  },

  createIndexes: async (indexes) => {
    try {
      for (const index of indexes) {
        await User.createIndex(index.name, index.fields);
      }
    } catch (error) {
      throw error;
    }
  },

  applyBatchOptimization: (query, batchSize) => {
    try {
      if (query instanceof Op.and) {
        return query.map(q => this.applyBatchOptimization(q, batchSize));
      }

      if (query instanceof Op.or) {
        return query.map(q => this.applyBatchOptimization(q, batchSize));
      }

      if (query instanceof Op.in) {
        const values = query.values;
        if (Array.isArray(values) && values.length > batchSize) {
          return values.reduce((acc, value, index) => {
            if (index % batchSize === 0) {
              acc.push([]);
            }
            acc[acc.length - 1].push(value);
            return acc;
          }, []).map(batch => ({
            [Op.in]: batch
          }));
        }
      }

      return query;
    } catch (error) {
      throw error;
    }
  },

  applyJoinOptimization: (query, joins) => {
    try {
      // Implement proper join optimization
      return query;
    } catch (error) {
      throw error;
    }
  },

  applyQueryHints: (query, hints) => {
    try {
      // Add query hints for optimization
      return query;
    } catch (error) {
      throw error;
    }
  },

  trackQuery: (query, options) => {
    try {
      // Track query type
      let queryType = options.type || 'SELECT';
      let queryMetrics = this.queryMetrics.queryTypes.get(queryType);
      if (!queryMetrics) {
        queryMetrics = {
          count: 0,
          duration: 0,
          maxDuration: 0,
          minDuration: Infinity
        };
        this.queryMetrics.queryTypes.set(queryType, queryMetrics);
      }
      queryMetrics.count++;

      // Track table usage
      let table = options.table || 'unknown';
      let tableMetrics = this.queryMetrics.tables.get(table);
      if (!tableMetrics) {
        tableMetrics = {
          count: 0,
          duration: 0,
          maxDuration: 0,
          minDuration: Infinity
        };
        this.queryMetrics.tables.set(table, tableMetrics);
      }
      tableMetrics.count++;

      this.queryMetrics.total++;
    } catch (error) {
      throw error;
    }
  },

  monitorQueries: () => {
    try {
      // Check slow queries
      const slowQueries = Array.from(this.queryMetrics.slowQueries.entries())
        .filter(([query, metrics]) => metrics.duration >= 1000) // 1 second
        .sort((a, b) => b[1].duration - a[1].duration);

      if (slowQueries.length > 0) {
        performanceMonitor.alerts.database = true;
        performanceMonitor.optimizations.database.push(`Detected slow queries: ${slowQueries.length}`);
      }

      // Check query distribution
      const queryDistribution = Array.from(this.queryMetrics.queryTypes.entries())
        .reduce((acc, [type, metrics]) => {
          acc[type] = (metrics.count / this.queryMetrics.total) * 100;
          return acc;
        }, {});

      // Check table usage
      const tableUsage = Array.from(this.queryMetrics.tables.entries())
        .reduce((acc, [table, metrics]) => {
          acc[table] = (metrics.count / this.queryMetrics.total) * 100;
          return acc;
        }, {});

      // Generate recommendations
      if (performanceMonitor.alerts.database) {
        performanceMonitor.optimizations.database.push(`Query distribution: ${JSON.stringify(queryDistribution)}`);
        performanceMonitor.optimizations.database.push(`Table usage: ${JSON.stringify(tableUsage)}`);
      }
    } catch (error) {
      throw error;
    }
  },

  getQueryStatistics: () => ({
    ...this.queryMetrics,
    slowQueries: Array.from(this.queryMetrics.slowQueries.entries())
      .sort((a, b) => b[1].duration - a[1].duration),
    queryDistribution: Array.from(this.queryMetrics.queryTypes.entries())
      .reduce((acc, [type, metrics]) => {
        acc[type] = (metrics.count / this.queryMetrics.total) * 100;
        return acc;
      }, {}),
    tableUsage: Array.from(this.queryMetrics.tables.entries())
      .reduce((acc, [table, metrics]) => {
        acc[table] = (metrics.count / this.queryMetrics.total) * 100;
        return acc;
      }, {})
  })
};

module.exports = databaseService;
