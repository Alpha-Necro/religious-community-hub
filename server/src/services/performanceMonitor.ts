import { performance } from 'perf_hooks';
import { securityAlertService } from './securityAlertService';
import { redisManager } from '../config/redis';
import { websocketServer } from './websocketServer';
import { RedisOperation } from '../config/redis';

export interface Metrics {
  cache?: {
    hits: number;
    misses: number;
    ratio: number;
    size: number;
    max: number;
  };
  system: {
    memory: {
      used: number;
      total: number;
      free: number;
      percentage: number;
    };
    cpu: {
      usage: number;
      load: number[];
    };
  };
  redis: {
    connection: {
      status: 'connected' | 'disconnected' | 'error' | 'reconnecting';
      lastError: string | null;
      reconnectAttempts: number;
      latency: number;
    };
    operations: {
      get: OperationMetrics;
      set: OperationMetrics;
      delete: OperationMetrics;
      exists: OperationMetrics;
      ttl: OperationMetrics;
      flushAll: OperationMetrics;
      ping: OperationMetrics;
    };
    circuitBreaker: CircuitBreakerState;
  };
  websocket: {
    activeConnections: number;
    errors: number;
    lastError: string;
    disconnects: number;
    lastDisconnect: {
      code: number;
      reason: string;
      timestamp: string;
    };
    circuitBreaker: CircuitBreakerState;
  };
  maintenance: {
    mode: 'maintenance' | 'normal';
    lastEntered: string | null;
    lastExited: string | null;
    recoveryAttempts: number;
    recoverySuccess: number;
    recoveryFailures: number;
    notifications: number;
    currentStatus: 'active' | 'inactive';
    lastMessage: string;
    lastNotification: string;
    circuitBreaker: CircuitBreakerState;
  };
  circuitBreakers: {
    [serviceName: string]: CircuitBreakerState;
  };
  health: {
    overall: 'healthy' | 'unhealthy' | 'degraded';
    lastCheck: string;
    checks: {
      [checkName: string]: {
        status: 'healthy' | 'unhealthy' | 'degraded';
        lastCheck: string;
        details: any;
      };
    };
  };
  errors?: {
    total: number;
    byType: {
      [key: string]: number;
    };
    byCategory: {
      [key: string]: number;
    };
  };
  uptime?: number;
}

export interface OperationMetrics {
  count: number;
  errors: number;
  avgResponseTime: number;
  success: boolean;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  resetTimeout: number;
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: {
    redis: {
      status: 'healthy' | 'unhealthy' | 'degraded';
      latency: number;
      lastError: string | null;
      lastCheck: string;
    };
    system: {
      status: 'healthy' | 'unhealthy' | 'degraded';
      memoryUsage: number;
      cpuLoad: number;
      lastCheck: string;
    };
    services: {
      [serviceName: string]: {
        status: 'healthy' | 'unhealthy' | 'degraded';
        lastError: string | null;
        lastCheck: string;
      };
    };
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private startTime: number;
  private metrics: Metrics = {
    cache: {
      hits: 0,
      misses: 0,
      ratio: 0,
      size: 0,
      max: 0,
    },
    system: {
      memory: {
        used: 0,
        total: 0,
        free: 0,
        percentage: 0,
      },
      cpu: {
        usage: 0,
        load: [],
      },
    },
    redis: {
      connection: {
        status: 'disconnected',
        lastError: '',
        reconnectAttempts: 0,
        latency: 0,
      },
      operations: {
        get: { count: 0, errors: 0, avgResponseTime: 0, success: true },
        set: { count: 0, errors: 0, avgResponseTime: 0, success: true },
        delete: { count: 0, errors: 0, avgResponseTime: 0, success: true },
        exists: { count: 0, errors: 0, avgResponseTime: 0, success: true },
        ttl: { count: 0, errors: 0, avgResponseTime: 0, success: true },
        flushAll: { count: 0, errors: 0, avgResponseTime: 0, success: true },
        ping: { count: 0, errors: 0, avgResponseTime: 0, success: true }
      },
      circuitBreaker: {
        state: 'closed',
        failureCount: 0,
        lastFailure: null,
        lastSuccess: null,
        resetTimeout: 30000,
      }
    },
    websocket: {
      activeConnections: 0,
      errors: 0,
      lastError: '',
      disconnects: 0,
      lastDisconnect: {
        code: 0,
        reason: '',
        timestamp: ''
      },
      circuitBreaker: {
        state: 'closed',
        failureCount: 0,
        lastFailure: null,
        lastSuccess: null,
        resetTimeout: 30000,
      }
    },
    maintenance: {
      mode: 'normal',
      lastEntered: null,
      lastExited: null,
      recoveryAttempts: 0,
      recoverySuccess: 0,
      recoveryFailures: 0,
      notifications: 0,
      currentStatus: 'inactive',
      lastMessage: '',
      lastNotification: '',
      circuitBreaker: {
        state: 'closed',
        failureCount: 0,
        lastFailure: null,
        lastSuccess: null,
        resetTimeout: 30000,
      }
    },
    circuitBreakers: {},
    health: {
      overall: 'healthy',
      lastCheck: '',
      checks: {}
    },
    errors: {
      total: 0,
      byType: {},
      byCategory: {}
    },
    uptime: 0
  };

  private constructor() {
    this.startTime = performance.now();
    this.initializeHealthChecks();
  }

  private initializeHealthChecks(): void {
    // Schedule periodic health checks
    setInterval(() => this.runHealthChecks(), 5000);
    
    // Schedule circuit breaker state updates
    setInterval(() => this.updateCircuitBreakers(), 1000);
  }

  private async runHealthChecks(): Promise<void> {
    try {
      const health: HealthCheck = {
        status: 'healthy',
        checks: {
          redis: await this.checkRedisHealth(),
          system: await this.checkSystemHealth(),
          services: await this.checkServicesHealth()
        }
      };

      this.metrics.health.overall = health.status;
      this.metrics.health.lastCheck = new Date().toISOString();
      this.metrics.health.checks = {
        redis: {
          status: health.checks.redis.status,
          lastCheck: health.checks.redis.lastCheck,
          details: {
            latency: health.checks.redis.latency,
            lastError: health.checks.redis.lastError
          }
        },
        system: {
          status: health.checks.system.status,
          lastCheck: health.checks.system.lastCheck,
          details: {
            memoryUsage: health.checks.system.memoryUsage,
            cpuLoad: health.checks.system.cpuLoad
          }
        }
      };

    } catch (error) {
      this.handleError(error);
    }
  }

  private async checkRedisHealth(): Promise<HealthCheck['checks']['redis']> {
    try {
      const latency = await this.measureRedisLatency();
      const status = latency > 1000 ? 'degraded' : 'healthy';
      return {
        status,
        latency,
        lastError: this.metrics.redis.connection.lastError,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: 0,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString()
      };
    }
  }

  private async checkSystemHealth(): Promise<HealthCheck['checks']['system']> {
    try {
      const memoryUsage = (this.metrics.system.memory.used / this.metrics.system.memory.total) * 100;
      const cpuLoad = this.metrics.system.cpu.load.reduce((a, b) => a + b, 0) / this.metrics.system.cpu.load.length;
      
      const status = memoryUsage > 90 || cpuLoad > 90 ? 'degraded' : 'healthy';
      
      return {
        status,
        memoryUsage,
        cpuLoad,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        memoryUsage: 0,
        cpuLoad: 0,
        lastCheck: new Date().toISOString()
      };
    }
  }

  private async checkServicesHealth(): Promise<HealthCheck['checks']['services']> {
    const services: { [key: string]: any } = {};
    
    // Add service health checks here
    // Example:
    // services['database'] = await this.checkDatabaseHealth();
    
    return services;
  }

  private async measureRedisLatency(): Promise<number> {
    const start = performance.now();
    try {
      await redisManager.client.ping();
      return performance.now() - start;
    } catch (error) {
      return 1000; // Return high latency on error
    }
  }

  private async updateCircuitBreakers(): Promise<void> {
    const now = new Date();
    
    // Update Redis circuit breaker
    if (this.metrics.redis.circuitBreaker.state === 'open' && 
        now.getTime() - (this.metrics.redis.circuitBreaker.lastFailure?.getTime() || 0) > this.metrics.redis.circuitBreaker.resetTimeout) {
      this.metrics.redis.circuitBreaker.state = 'half-open';
    }

    // Update WebSocket circuit breaker
    if (this.metrics.websocket.circuitBreaker.state === 'open' && 
        now.getTime() - (this.metrics.websocket.circuitBreaker.lastFailure?.getTime() || 0) > this.metrics.websocket.circuitBreaker.resetTimeout) {
      this.metrics.websocket.circuitBreaker.state = 'half-open';
    }

    // Update maintenance circuit breaker
    if (this.metrics.maintenance.circuitBreaker.state === 'open' && 
        now.getTime() - (this.metrics.maintenance.circuitBreaker.lastFailure?.getTime() || 0) > this.metrics.maintenance.circuitBreaker.resetTimeout) {
      this.metrics.maintenance.circuitBreaker.state = 'half-open';
    }
  }

  public async trackRedisOperation(
    operation: RedisOperation,
    key: string,
    success: boolean,
    responseTime: number
  ): Promise<void> {
    try {
      const metrics = this.metrics.redis.operations[operation];
      if (metrics) {
        metrics.count++;
        metrics.avgResponseTime = (metrics.avgResponseTime * (metrics.count - 1) + responseTime) / metrics.count;
        metrics.success = success;
        if (!success) {
          metrics.errors++;
          this.updateCircuitBreaker('redis', success);
        }
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  private async updateCircuitBreaker(service: 'redis' | 'websocket' | 'maintenance', success: boolean): Promise<void> {
    const now = new Date();
    
    switch (service) {
      case 'redis':
        if (!success) {
          this.metrics.redis.circuitBreaker.failureCount++;
          this.metrics.redis.circuitBreaker.lastFailure = now;
          this.metrics.redis.circuitBreaker.lastSuccess = null;
          
          if (this.metrics.redis.circuitBreaker.failureCount >= 5) {
            this.metrics.redis.circuitBreaker.state = 'open';
          }
        } else {
          this.metrics.redis.circuitBreaker.failureCount = 0;
          this.metrics.redis.circuitBreaker.lastSuccess = now;
          if (this.metrics.redis.circuitBreaker.state === 'half-open') {
            this.metrics.redis.circuitBreaker.state = 'closed';
          }
        }
        break;

      case 'websocket':
        // Similar logic for websocket circuit breaker
        break;

      case 'maintenance':
        // Similar logic for maintenance circuit breaker
        break;
    }
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  public async updateMetrics(metrics: Partial<Metrics>): Promise<void> {
    try {
      // Update Redis metrics if present
      if (metrics.redis) {
        // Update connection status
        if (metrics.redis.connection) {
          const connectionMetrics = metrics.redis.connection;
          this.metrics.redis.connection = {
            status: connectionMetrics.status,
            lastError: connectionMetrics.lastError || '',
            reconnectAttempts: connectionMetrics.reconnectAttempts || 0,
            latency: connectionMetrics.latency || 0
          };
        }

        // Track Redis operations
        if (metrics.redis.operations) {
          const operations = metrics.redis.operations;
          for (const [operation, stats] of Object.entries(operations)) {
            const operationName = operation as keyof typeof operations;
            const operationMetrics = this.metrics.redis.operations[operationName];
            if (operationMetrics) {
              operationMetrics.count++;
              operationMetrics.avgResponseTime = 
                (operationMetrics.avgResponseTime * (operationMetrics.count - 1) + stats.avgResponseTime) / operationMetrics.count;
              operationMetrics.success = stats.success;
              if (!stats.success) {
                operationMetrics.errors++;
              }
            }
          }
        }
      }

      // Update other metrics
      this.metrics = {
        ...this.metrics,
        ...metrics
      };

      // Log the update
      securityAlertService.logSystemEvent(
        'metrics_update',
        { metrics },
        'info'
      );

    } catch (error) {
      await this.handleError(error);
    }
  }

  public async start(): Promise<void> {
    // Start monitoring system metrics
    this.monitorSystemMetrics();
    
    // Start monitoring Redis metrics
    this.monitorRedisMetrics();
    
    // Start monitoring maintenance mode
    this.monitorMaintenanceMode();
  }

  private async monitorSystemMetrics(): Promise<void> {
    // Implement system metrics monitoring
    setInterval(() => {
      // Update system metrics
      this.metrics.system.memory.used = process.memoryUsage().heapUsed;
      this.metrics.system.memory.total = process.memoryUsage().heapTotal;
      this.metrics.system.memory.free = process.memoryUsage().heapTotal - process.memoryUsage().heapUsed;
      this.metrics.system.memory.percentage = (this.metrics.system.memory.used / this.metrics.system.memory.total) * 100;
      this.metrics.system.cpu.usage = this.calculateLoad();

      this.updateMetrics({
        system: this.metrics.system,
        uptime: Math.floor((performance.now() - this.startTime) / 1000)
      });
    }, 5000); // Update every 5 seconds
  }

  private async monitorRedisMetrics(): Promise<void> {
    try {
      // Check Redis connection status every 5 seconds
      setInterval(async () => {
        const status = redisManager.connectionStatus;
        const lastError = redisManager.lastError;
        const reconnectAttempts = redisManager.reconnectAttempts;

        // Update connection status
        const metrics: Partial<Metrics> = {
          redis: {
            connection: {
              status,
              lastError,
              reconnectAttempts,
              latency: redisManager.latency,
            },
            operations: {},
          },
        };

        // Track Redis operations
        const operations = redisManager.redisMetrics.redis.operations;
        if (operations) {
          metrics.redis.operations = {
            get: operations.get,
            set: operations.set,
            delete: operations.delete,
            exists: operations.exists,
            ttl: operations.ttl,
            flushAll: operations.flushAll,
            ping: operations.ping,
          };
        }

        this.updateMetrics(metrics);
      }, 5000);
    } catch (error) {
      await this.handleError(error as Error);
    }
  }

  private async monitorMaintenanceMode(): Promise<void> {
    try {
      // Check maintenance mode status every 5 seconds
      setInterval(async () => {
        const maintenance = this.metrics.maintenance;
        if (maintenance?.mode === 'maintenance') {
          // Check if we should attempt recovery
          if (maintenance.recoveryAttempts < 3) {
            try {
              // Attempt to recover services
              await this.attemptServiceRecovery();
              
              // If successful, exit maintenance mode
              await this.exitMaintenanceMode('Automatic recovery successful');
            } catch (error) {
              // Update recovery attempts
              this.updateMetrics({
                maintenance: {
                  mode: maintenance.mode,
                  lastEntered: maintenance.lastEntered,
                  lastExited: maintenance.lastExited,
                  recoveryAttempts: maintenance.recoveryAttempts + 1,
                  recoverySuccess: maintenance.recoverySuccess,
                  recoveryFailures: maintenance.recoveryFailures + 1,
                },
              });
            }
          }
        }
      }, 5000);
    } catch (error) {
      await this.handleError(error as Error);
    }
  }

  public async enterMaintenanceMode(reason: string): Promise<void> {
    try {
      const now = new Date();
      
      // Update maintenance metrics
      this.updateMetrics({
        maintenance: {
          mode: 'maintenance',
          lastEntered: now.toISOString(),
          lastExited: null,
          recoveryAttempts: 0,
          recoverySuccess: 0,
          recoveryFailures: 0,
          notifications: 0,
          currentStatus: 'active',
          lastMessage: reason,
          lastNotification: reason,
        },
      });

      // Log the event
      securityAlertService.sendAlert(
        'maintenance_mode_entered',
        `System entering maintenance mode: ${reason}`
      );

      // Notify connected clients
      await websocketServer.broadcastMaintenanceMode('active', `System entering maintenance mode: ${reason}`);
    } catch (error) {
      await this.handleError(error as Error);
      throw error;
    }
  }

  public async exitMaintenanceMode(reason: string): Promise<void> {
    try {
      const now = new Date();
      const maintenance = this.metrics.maintenance;
      
      // Update maintenance metrics
      this.updateMetrics({
        maintenance: {
          mode: 'normal',
          lastEntered: maintenance?.lastEntered ?? null,
          lastExited: now.toISOString(),
          recoveryAttempts: maintenance?.recoveryAttempts ?? 0,
          recoverySuccess: maintenance?.recoverySuccess ?? 0,
          recoveryFailures: maintenance?.recoveryFailures ?? 0,
          notifications: maintenance?.notifications ?? 0,
          currentStatus: 'inactive',
          lastMessage: reason,
          lastNotification: reason,
        },
      });

      // Log the event
      securityAlertService.sendAlert(
        'maintenance_mode_exited',
        `System exiting maintenance mode: ${reason}`
      );

      // Notify connected clients
      await websocketServer.broadcastMaintenanceMode('inactive', `System exiting maintenance mode: ${reason}`);
    } catch (error) {
      await this.handleError(error as Error);
      throw error;
    }
  }

  private async attemptServiceRecovery(): Promise<void> {
    try {
      // Check Redis connection
      if (!redisManager.isConnected) {
        await redisManager.connect();
      }

      // Check database connection
      // Add other service checks as needed

      // If all services are healthy, throw an error to trigger maintenance mode exit
      throw new Error('All services recovered successfully');
    } catch (error) {
      // If recovery fails, just log it and continue
      securityAlertService.sendAlert(
        'maintenance_recovery_attempt',
        `Recovery attempt failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleError(error: Error): Promise<void> {
    // Log the error
    securityAlertService.sendAlert(
      'performance_monitor_error',
      `Performance monitor error: ${error.message}`
    );

    // Update error metrics
    this.updateMetrics({
      errors: {
        total: (this.metrics.errors?.total ?? 0) + 1,
        byType: { ...this.metrics.errors?.byType, [error.name]: (this.metrics.errors?.byType?.[error.name] ?? 0) + 1 },
        byCategory: { ...this.metrics.errors?.byCategory, [error.name]: (this.metrics.errors?.byCategory?.[error.name] ?? 0) + 1 },
      }
    });
  }

  public getMetrics(): Metrics {
    return {
      ...this.metrics,
      uptime: Math.floor((performance.now() - this.startTime) / 1000)
    };
  }

  public async logSecurityEvent(event: {
    type: 'access' | 'authentication' | 'authorization' | 'audit';
    severity: 'info' | 'warning' | 'error' | 'critical';
    details: any;
    timestamp?: string;
  }): Promise<void> {
    // Implement security event logging
  }

  public async trackSecurityEvent(
    category: string,
    severity: 'info' | 'warning' | 'error' | 'critical',
    details: any
  ): Promise<void> {
    // Implement security event tracking
  }

  public async logError(
    type: string,
    message: string,
    severity: 'info' | 'warning' | 'error' | 'critical'
  ): Promise<void> {
    // Implement error logging
  }

  public async trackRequest(
    method: string,
    path: string,
    responseTime: number,
    status: number
  ): Promise<void> {
    // Implement request tracking
  }

  public async trackCacheOperation(
    operation: 'get' | 'set' | 'delete',
    key: string,
    success: boolean,
    responseTime: number
  ): Promise<void> {
    // Implement cache operation tracking
  }

  public async trackRedisOperation(
    operation: RedisOperation,
    key: string,
    success: boolean,
    responseTime: number
  ): Promise<void> {
    try {
      const metrics = redisManager.redisMetrics.redis.operations[operation];
      if (metrics) {
        metrics.count++;
        metrics.avgResponseTime = (metrics.avgResponseTime * (metrics.count - 1) + responseTime) / metrics.count;
        metrics.success = success;
        if (!success) {
          metrics.errors++;
        }

        this.updateMetrics({
          redis: {
            operations: {
              [operation]: metrics
            }
          }
        });
      }
    } catch (error) {
      await this.handleError(error as Error);
    }
  }

  private calculateLoad(): number {
    // Implement load calculation
    return 0; // Placeholder
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
