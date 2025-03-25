import { performanceMonitor } from './performanceMonitor';
import { securityAlertService } from './securityAlertService';
import { AppError } from '../types/error';
import { WebSocket } from 'ws';

export class MonitoringService {
  private static instance: MonitoringService;

  private constructor() {}

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  public async getCache(key: string): Promise<any | null> {
    try {
      const startTime = performance.now();
      const data = await performanceMonitor.trackCacheOperation('get', key, true, 0);
      const responseTime = performance.now() - startTime;

      await performanceMonitor.updateMetrics({
        cache: {
          hits: data ? (performanceMonitor.getMetrics().cache?.hits || 0) + 1 : performanceMonitor.getMetrics().cache?.hits,
          misses: !data ? (performanceMonitor.getMetrics().cache?.misses || 0) + 1 : performanceMonitor.getMetrics().cache?.misses,
          ratio: data ? ((performanceMonitor.getMetrics().cache?.hits || 0) + 1) / ((performanceMonitor.getMetrics().cache?.hits || 0) + (performanceMonitor.getMetrics().cache?.misses || 0) + 1) : performanceMonitor.getMetrics().cache?.ratio,
          size: performanceMonitor.getMetrics().cache?.size,
          max: performanceMonitor.getMetrics().cache?.max
        }
      });

      return data;
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  public async setCache(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const startTime = performance.now();
      await performanceMonitor.trackCacheOperation('set', key, true, 0);
      const responseTime = performance.now() - startTime;

      await performanceMonitor.updateMetrics({
        cache: {
          hits: (performanceMonitor.getMetrics().cache?.hits || 0) + 1,
          misses: performanceMonitor.getMetrics().cache?.misses,
          ratio: ((performanceMonitor.getMetrics().cache?.hits || 0) + 1) / ((performanceMonitor.getMetrics().cache?.hits || 0) + (performanceMonitor.getMetrics().cache?.misses || 0) + 1),
          size: performanceMonitor.getMetrics().cache?.size,
          max: performanceMonitor.getMetrics().cache?.max
        }
      });
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  public async deleteCache(key: string): Promise<void> {
    try {
      const startTime = performance.now();
      await performanceMonitor.trackCacheOperation('delete', key, true, 0);
      const responseTime = performance.now() - startTime;

      await performanceMonitor.updateMetrics({
        cache: {
          hits: (performanceMonitor.getMetrics().cache?.hits || 0) + 1,
          misses: performanceMonitor.getMetrics().cache?.misses,
          ratio: ((performanceMonitor.getMetrics().cache?.hits || 0) + 1) / ((performanceMonitor.getMetrics().cache?.hits || 0) + (performanceMonitor.getMetrics().cache?.misses || 0) + 1),
          size: performanceMonitor.getMetrics().cache?.size,
          max: performanceMonitor.getMetrics().cache?.max
        }
      });
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  public async validateRequest(req: any): Promise<void> {
    try {
      const startTime = performance.now();
      await performanceMonitor.trackRequest(req.method, req.path, 0, 200);
      const responseTime = performance.now() - startTime;

      await performanceMonitor.updateMetrics({
        system: {
          memory: performanceMonitor.getMetrics().system?.memory,
          cpu: performanceMonitor.getMetrics().system?.cpu
        }
      });
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  public async startPerformanceMonitoring(): Promise<void> {
    try {
      await performanceMonitor.start();
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  public async stopPerformanceMonitoring(): Promise<void> {
    try {
      // PerformanceMonitor doesn't have a stop method, just update metrics
      await performanceMonitor.updateMetrics({
        system: {
          memory: performanceMonitor.getMetrics().system?.memory,
          cpu: performanceMonitor.getMetrics().system?.cpu
        }
      });
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  public trackWebSocketError(error: Error, client?: WebSocket): void {
    performanceMonitor.updateMetrics({
      websocket: {
        errors: (performanceMonitor.getMetrics().websocket?.errors || 0) + 1,
        lastError: error.message,
        activeConnections: (client ? (performanceMonitor.getMetrics().websocket?.activeConnections || 0) - 1 : performanceMonitor.getMetrics().websocket?.activeConnections),
        disconnects: performanceMonitor.getMetrics().websocket?.disconnects,
        lastDisconnect: performanceMonitor.getMetrics().websocket?.lastDisconnect,
        circuitBreaker: performanceMonitor.getMetrics().websocket?.circuitBreaker
      }
    });
  }

  public trackWebSocketDisconnect(client: WebSocket, code: number, reason: Buffer | string): void {
    performanceMonitor.updateMetrics({
      websocket: {
        activeConnections: (performanceMonitor.getMetrics().websocket?.activeConnections || 0) - 1,
        disconnects: (performanceMonitor.getMetrics().websocket?.disconnects || 0) + 1,
        lastDisconnect: {
          code,
          reason: reason.toString(),
          timestamp: new Date().toISOString()
        },
        circuitBreaker: performanceMonitor.getMetrics().websocket?.circuitBreaker
      }
    });
  }

  public trackMaintenanceBroadcast(status: 'active' | 'inactive', message: string): void {
    performanceMonitor.updateMetrics({
      maintenance: {
        mode: performanceMonitor.getMetrics().maintenance?.mode,
        lastEntered: performanceMonitor.getMetrics().maintenance?.lastEntered,
        lastExited: performanceMonitor.getMetrics().maintenance?.lastExited,
        recoveryAttempts: performanceMonitor.getMetrics().maintenance?.recoveryAttempts,
        recoverySuccess: performanceMonitor.getMetrics().maintenance?.recoverySuccess,
        recoveryFailures: performanceMonitor.getMetrics().maintenance?.recoveryFailures,
        notifications: (performanceMonitor.getMetrics().maintenance?.notifications || 0) + 1,
        currentStatus: status,
        lastMessage: message,
        lastNotification: new Date().toISOString(),
        circuitBreaker: performanceMonitor.getMetrics().maintenance?.circuitBreaker
      }
    });
  }

  private async handleError(error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await securityAlertService.sendAlert(
      'Monitoring Service Error',
      errorMessage
    );

    await performanceMonitor.updateMetrics({
      errors: {
        total: (performanceMonitor.getMetrics().errors?.total || 0) + 1,
        byType: {
          monitoring: (performanceMonitor.getMetrics().errors?.byType?.monitoring || 0) + 1
        },
        byCategory: {
          service: (performanceMonitor.getMetrics().errors?.byCategory?.service || 0) + 1
        }
      }
    });

    throw new AppError(errorMessage);
  }
}

export const monitoringService = MonitoringService.getInstance();
