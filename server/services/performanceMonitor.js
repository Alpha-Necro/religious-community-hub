const { securityAlertService } = require('./securityAlertService');
const { cachingService } = require('./cachingService');
const { Op } = require('sequelize');
const User = require('../models/User');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const perf_hooks = require('perf_hooks');
const process = require('process');

const performanceMonitor = {
  metrics: {
    MEMORY: 'MEMORY',
    CPU: 'CPU',
    RESPONSE_TIME: 'RESPONSE_TIME',
    REQUEST_RATE: 'REQUEST_RATE',
    CACHE: 'CACHE',
    DATABASE: 'DATABASE',
    API: 'API',
    NETWORK: 'NETWORK',
    LOAD: 'LOAD'
  },

  thresholds: {
    MEMORY: {
      WARNING: process.env.MEMORY_THRESHOLD * 0.8,  // 80% of threshold
      CRITICAL: process.env.MEMORY_THRESHOLD
    },
    CPU: {
      WARNING: process.env.CPU_THRESHOLD * 0.8,  // 80% of threshold
      CRITICAL: process.env.CPU_THRESHOLD
    },
    RESPONSE_TIME: {
      WARNING: process.env.RESPONSE_TIME_THRESHOLD * 0.8,  // 80% of threshold
      CRITICAL: process.env.RESPONSE_TIME_THRESHOLD
    },
    REQUEST_RATE: {
      WARNING: process.env.REQUEST_RATE_THRESHOLD * 0.8,  // 80% of threshold
      CRITICAL: process.env.REQUEST_RATE_THRESHOLD
    },
    API: {
      LATENCY: {
        WARNING: 200,  // ms
        CRITICAL: 500  // ms
      },
      ERROR_RATE: {
        WARNING: 0.02,  // 2%
        CRITICAL: 0.05  // 5%
      }
    },
    NETWORK: {
      LATENCY: {
        WARNING: 100,  // ms
        CRITICAL: 200  // ms
      },
      THROUGHPUT: {
        WARNING: 1000000,  // 1MB/s
        CRITICAL: 500000  // 500KB/s
      }
    },
    LOAD: {
      CONCURRENT_REQUESTS: {
        WARNING: 100,
        CRITICAL: 200
      },
      QUEUE_LENGTH: {
        WARNING: 50,
        CRITICAL: 100
      }
    }
  },

  initialize: async () => {
    try {
      // Initialize performance monitoring
      this.monitoringInterval = setInterval(() => {
        this.monitorPerformance();
      }, process.env.PERFORMANCE_MONITOR_INTERVAL || 30000); // Reduced to 30s for more frequent monitoring

      // Initialize request monitoring
      this.requestMetrics = {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        errors: 0,
        concurrent: 0,
        queueLength: 0,
        endpoints: new Map(),  // Track per-endpoint metrics
        methods: new Map()    // Track per-method metrics
      };

      // Initialize database monitoring
      this.dbMetrics = {
        queries: 0,
        totalDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        errors: 0,
        cacheHits: 0,
        cacheMisses: 0,
        queryTypes: new Map(),  // Track per-query type metrics
        tables: new Map()      // Track per-table metrics
      };

      // Initialize cache monitoring
      this.cacheMetrics = {
        hits: 0,
        misses: 0,
        evictions: 0,
        size: 0,
        max: 0,
        hitRate: 0,
        missRate: 0,
        regions: new Map()  // Track per-region metrics
      };

      // Initialize system monitoring
      this.systemMetrics = {
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          usage: 0,
          heapUsed: 0,
          heapTotal: 0
        },
        cpu: {
          load: 0,
          cores: os.cpus().length,
          usage: 0,
          user: 0,
          system: 0
        },
        network: {
          sent: 0,
          received: 0,
          latency: 0,
          throughput: 0
        },
        process: {
          memory: 0,
          cpu: 0,
          uptime: 0,
          handles: 0
        }
      };

      // Initialize performance alerts
      this.alerts = {
        memory: false,
        cpu: false,
        responseTime: false,
        requestRate: false,
        cache: false,
        database: false,
        api: false,
        network: false,
        load: false
      };

      // Initialize optimization recommendations
      this.optimizations = {
        memory: [],
        cpu: [],
        database: [],
        cache: [],
        api: [],
        network: [],
        load: []
      };

      return true;
    } catch (error) {
      securityAlertService.createAlert({
        title: 'Performance Monitor Initialization Failed',
        description: `Failed to initialize performance monitoring: ${error.message}`,
        severity: 'CRITICAL',
        type: 'PERFORMANCE',
        metadata: { error }
      });
      throw error;
    }
  },

  monitorPerformance: async () => {
    try {
      // Monitor all performance metrics
      await Promise.all([
        this.monitorMemory(),
        this.monitorCPU(),
        this.monitorResponseTimes(),
        this.monitorRequestRate(),
        this.monitorCache(),
        this.monitorDatabase(),
        this.monitorSystem(),
        this.monitorAPI(),
        this.monitorNetwork(),
        this.monitorLoad()
      ]);

      // Generate recommendations
      this.generatePerformanceRecommendations();

      // Save report if needed
      if (this.shouldSaveReport()) {
        await this.saveReportToFile(this.generatePerformanceReport());
        this.rotateReports();
      }

      // Reset metrics for next cycle
      this.resetMetrics();
    } catch (error) {
      securityAlertService.createAlert({
        title: 'Performance Monitoring Failed',
        description: `Failed to monitor performance: ${error.message}`,
        severity: 'CRITICAL',
        type: 'PERFORMANCE',
        metadata: { error }
      });
      throw error;
    }
  },

  monitorMemory: async () => {
    const memory = process.memoryUsage();
    const heapUsed = memory.heapUsed;
    const heapTotal = memory.heapTotal;

    this.systemMetrics.memory.heapUsed = heapUsed;
    this.systemMetrics.memory.heapTotal = heapTotal;
    this.systemMetrics.memory.usage = (heapUsed / heapTotal) * 100;

    // Check thresholds
    if (this.systemMetrics.memory.usage >= this.thresholds.MEMORY.CRITICAL) {
      this.alerts.memory = true;
      this.optimizations.memory.push('Consider increasing memory allocation or optimizing memory usage');
    } else if (this.systemMetrics.memory.usage >= this.thresholds.MEMORY.WARNING) {
      this.alerts.memory = true;
      this.optimizations.memory.push('Monitor memory usage closely and consider optimizing memory-intensive operations');
    }
  },

  monitorCPU: async () => {
    const cpu = process.cpuUsage();
    const uptime = process.uptime();

    this.systemMetrics.cpu.usage = (cpu.user + cpu.system) / 1000000; // Convert to seconds
    this.systemMetrics.cpu.user = cpu.user / 1000000;
    this.systemMetrics.cpu.system = cpu.system / 1000000;

    // Check thresholds
    if (this.systemMetrics.cpu.usage >= this.thresholds.CPU.CRITICAL) {
      this.alerts.cpu = true;
      this.optimizations.cpu.push('Consider optimizing CPU-intensive operations or scaling horizontally');
    } else if (this.systemMetrics.cpu.usage >= this.thresholds.CPU.WARNING) {
      this.alerts.cpu = true;
      this.optimizations.cpu.push('Monitor CPU usage closely and consider optimizing CPU usage');
    }
  },

  monitorAPI: async () => {
    const endpoints = Array.from(this.requestMetrics.endpoints.entries());
    const methods = Array.from(this.requestMetrics.methods.entries());

    // Calculate endpoint performance
    endpoints.forEach(([endpoint, metrics]) => {
      const avgLatency = metrics.totalDuration / metrics.count;
      const errorRate = metrics.errors / metrics.count;

      if (avgLatency >= this.thresholds.API.LATENCY.CRITICAL) {
        this.alerts.api = true;
        this.optimizations.api.push(`Endpoint ${endpoint} has high latency (${avgLatency}ms)`);
      }

      if (errorRate >= this.thresholds.API.ERROR_RATE.CRITICAL) {
        this.alerts.api = true;
        this.optimizations.api.push(`Endpoint ${endpoint} has high error rate (${errorRate * 100}%)`);
      }
    });

    // Calculate method performance
    methods.forEach(([method, metrics]) => {
      const avgLatency = metrics.totalDuration / metrics.count;
      const errorRate = metrics.errors / metrics.count;

      if (avgLatency >= this.thresholds.API.LATENCY.CRITICAL) {
        this.alerts.api = true;
        this.optimizations.api.push(`Method ${method} has high latency (${avgLatency}ms)`);
      }

      if (errorRate >= this.thresholds.API.ERROR_RATE.CRITICAL) {
        this.alerts.api = true;
        this.optimizations.api.push(`Method ${method} has high error rate (${errorRate * 100}%)`);
      }
    });
  },

  monitorNetwork: async () => {
    const network = os.networkInterfaces();
    const stats = os.networkInterfaces();

    // Calculate network metrics
    Object.keys(network).forEach(interfaceName => {
      const iface = network[interfaceName];
      iface.forEach(addr => {
        if (addr.family === 'IPv4') {
          const ifaceStats = stats[interfaceName];
          if (ifaceStats) {
            this.systemMetrics.network.throughput = ifaceStats.txbytes + ifaceStats.rxbytes;
            this.systemMetrics.network.latency = ifaceStats.txerrors + ifaceStats.rxerrors;
          }
        }
      });
    });

    // Check thresholds
    if (this.systemMetrics.network.latency >= this.thresholds.NETWORK.LATENCY.CRITICAL) {
      this.alerts.network = true;
      this.optimizations.network.push('High network latency detected');
    }

    if (this.systemMetrics.network.throughput <= this.thresholds.NETWORK.THROUGHPUT.CRITICAL) {
      this.alerts.network = true;
      this.optimizations.network.push('Low network throughput detected');
    }
  },

  monitorLoad: async () => {
    const loadavg = os.loadavg();
    const uptime = process.uptime();

    this.systemMetrics.load = {
      one: loadavg[0],
      five: loadavg[1],
      fifteen: loadavg[2]
    };

    // Check thresholds
    if (this.requestMetrics.concurrent >= this.thresholds.LOAD.CONCURRENT_REQUESTS.CRITICAL) {
      this.alerts.load = true;
      this.optimizations.load.push('High concurrent requests detected');
    }

    if (this.requestMetrics.queueLength >= this.thresholds.LOAD.QUEUE_LENGTH.CRITICAL) {
      this.alerts.load = true;
      this.optimizations.load.push('Long request queue detected');
    }
  },

  generatePerformanceReport: () => ({
    timestamp: new Date(),
    metrics: {
      memory: this.systemMetrics.memory,
      cpu: this.systemMetrics.cpu,
      network: this.systemMetrics.network,
      process: this.systemMetrics.process,
      requests: this.requestMetrics,
      database: this.dbMetrics,
      cache: this.cacheMetrics,
      load: this.systemMetrics.load
    },
    alerts: this.alerts,
    recommendations: this.optimizations
  }),

  generatePerformanceRecommendations: () => {
    // Memory recommendations
    if (this.alerts.memory) {
      this.optimizations.memory.push('Consider implementing more aggressive garbage collection');
      this.optimizations.memory.push('Review memory-intensive operations');
    }

    // CPU recommendations
    if (this.alerts.cpu) {
      this.optimizations.cpu.push('Consider implementing worker processes');
      this.optimizations.cpu.push('Review CPU-intensive operations');
    }

    // Database recommendations
    if (this.alerts.database) {
      this.optimizations.database.push('Consider implementing query optimization');
      this.optimizations.database.push('Review database indexes');
    }

    // Cache recommendations
    if (this.alerts.cache) {
      this.optimizations.cache.push('Consider increasing cache size');
      this.optimizations.cache.push('Review cache eviction strategy');
    }

    // API recommendations
    if (this.alerts.api) {
      this.optimizations.api.push('Consider implementing request rate limiting');
      this.optimizations.api.push('Review API endpoint performance');
    }

    // Network recommendations
    if (this.alerts.network) {
      this.optimizations.network.push('Consider implementing network optimization');
      this.optimizations.network.push('Review network configuration');
    }

    // Load recommendations
    if (this.alerts.load) {
      this.optimizations.load.push('Consider implementing horizontal scaling');
      this.optimizations.load.push('Review load balancing configuration');
    }
  },

  trackRequest: (endpoint, method, startTime, duration, success) => {
    // Update overall metrics
    this.requestMetrics.count++;
    this.requestMetrics.totalDuration += duration;
    this.requestMetrics.maxDuration = Math.max(this.requestMetrics.maxDuration, duration);
    this.requestMetrics.minDuration = Math.min(this.requestMetrics.minDuration, duration);
    if (!success) this.requestMetrics.errors++;

    // Update endpoint metrics
    let endpointMetrics = this.requestMetrics.endpoints.get(endpoint);
    if (!endpointMetrics) {
      endpointMetrics = {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        errors: 0
      };
      this.requestMetrics.endpoints.set(endpoint, endpointMetrics);
    }
    endpointMetrics.count++;
    endpointMetrics.totalDuration += duration;
    endpointMetrics.maxDuration = Math.max(endpointMetrics.maxDuration, duration);
    endpointMetrics.minDuration = Math.min(endpointMetrics.minDuration, duration);
    if (!success) endpointMetrics.errors++;

    // Update method metrics
    let methodMetrics = this.requestMetrics.methods.get(method);
    if (!methodMetrics) {
      methodMetrics = {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        errors: 0
      };
      this.requestMetrics.methods.set(method, methodMetrics);
    }
    methodMetrics.count++;
    methodMetrics.totalDuration += duration;
    methodMetrics.maxDuration = Math.max(methodMetrics.maxDuration, duration);
    methodMetrics.minDuration = Math.min(methodMetrics.minDuration, duration);
    if (!success) methodMetrics.errors++;
  },

  trackDatabaseQuery: (queryType, tableName, duration, success) => {
    // Update overall metrics
    this.dbMetrics.queries++;
    this.dbMetrics.totalDuration += duration;
    this.dbMetrics.maxDuration = Math.max(this.dbMetrics.maxDuration, duration);
    this.dbMetrics.minDuration = Math.min(this.dbMetrics.minDuration, duration);
    if (!success) this.dbMetrics.errors++;

    // Update query type metrics
    let queryMetrics = this.dbMetrics.queryTypes.get(queryType);
    if (!queryMetrics) {
      queryMetrics = {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        errors: 0
      };
      this.dbMetrics.queryTypes.set(queryType, queryMetrics);
    }
    queryMetrics.count++;
    queryMetrics.totalDuration += duration;
    queryMetrics.maxDuration = Math.max(queryMetrics.maxDuration, duration);
    queryMetrics.minDuration = Math.min(queryMetrics.minDuration, duration);
    if (!success) queryMetrics.errors++;

    // Update table metrics
    let tableMetrics = this.dbMetrics.tables.get(tableName);
    if (!tableMetrics) {
      tableMetrics = {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        errors: 0
      };
      this.dbMetrics.tables.set(tableName, tableMetrics);
    }
    tableMetrics.count++;
    tableMetrics.totalDuration += duration;
    tableMetrics.maxDuration = Math.max(tableMetrics.maxDuration, duration);
    tableMetrics.minDuration = Math.min(tableMetrics.minDuration, duration);
    if (!success) tableMetrics.errors++;
  },

  trackCacheOperation: (region, type, success) => {
    // Update overall metrics
    if (type === 'hit') this.cacheMetrics.hits++;
    else if (type === 'miss') this.cacheMetrics.misses++;

    // Update region metrics
    let regionMetrics = this.cacheMetrics.regions.get(region);
    if (!regionMetrics) {
      regionMetrics = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        missRate: 0
      };
      this.cacheMetrics.regions.set(region, regionMetrics);
    }
    if (type === 'hit') regionMetrics.hits++;
    else if (type === 'miss') regionMetrics.misses++;

    // Calculate hit/miss rates
    const total = regionMetrics.hits + regionMetrics.misses;
    if (total > 0) {
      regionMetrics.hitRate = (regionMetrics.hits / total) * 100;
      regionMetrics.missRate = (regionMetrics.misses / total) * 100;
    }
  }
};

module.exports = performanceMonitor;
