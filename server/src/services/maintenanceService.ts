import { performanceMonitor } from './performanceMonitor';
import { securityAuditService } from './securityAuditService';
import { redisManager } from '../config/redis';
import { websocketServer } from './websocketServer';

export class MaintenanceService {
  private static instance: MaintenanceService;
  private isMaintenanceMode = false;
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 3;
  private shutdownInProgress = false;

  private constructor() {}

  public static getInstance(): MaintenanceService {
    if (!MaintenanceService.instance) {
      MaintenanceService.instance = new MaintenanceService();
    }
    return MaintenanceService.instance;
  }

  public isInMaintenanceMode(): boolean {
    return this.isMaintenanceMode;
  }

  public async enterMaintenanceMode(error: Error): Promise<void> {
    try {
      if (this.shutdownInProgress) {
        return;
      }

      this.isMaintenanceMode = true;
      
      // Notify connected clients
      try {
        await websocketServer.broadcastMaintenanceMode('active', error.message);
      } catch (error) {
        console.error('Failed to notify WebSocket clients:', error);
      }
      
      // Log the maintenance mode entry
      securityAuditService.logSystemEvent(
        'maintenance_mode_entered',
        { error: error.message },
        'critical'
      );

      // Update performance metrics
      performanceMonitor.updateMetrics({
        maintenance: {
          mode: 'maintenance',
          lastEntered: new Date().toISOString(),
          lastExited: null,
          recoveryAttempts: 0,
          recoverySuccess: 0,
          recoveryFailures: 0,
          notifications: 1,
          currentStatus: 'active',
          lastMessage: error.message,
          lastNotification: new Date().toISOString(),
          circuitBreaker: {
            state: 'closed',
            failureCount: 0,
            lastFailure: null,
            lastSuccess: null,
            resetTimeout: 30000
          }
        }
      });

      // Set maintenance mode in Redis
      await redisManager.set('system:maintenance', JSON.stringify({
        active: true,
        reason: error.message,
        timestamp: new Date().toISOString()
      }), 3600); // Cache for 1 hour

      console.log('System entered maintenance mode due to critical error');
    } catch (error: unknown) {
      console.error('Failed to enter maintenance mode:', error);
      securityAuditService.logSystemEvent(
        'maintenance_mode_failure',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'critical'
      );
    }
  }

  public async exitMaintenanceMode(): Promise<void> {
    try {
      if (this.shutdownInProgress) {
        return;
      }

      this.isMaintenanceMode = false;
      this.recoveryAttempts = 0;

      // Notify connected clients
      try {
        await websocketServer.broadcastMaintenanceMode('inactive', 'System recovered');
      } catch (error) {
        console.error('Failed to notify WebSocket clients:', error);
      }

      // Log the maintenance mode exit
      securityAuditService.logSystemEvent(
        'maintenance_mode_exited',
        { reason: 'System recovered' },
        'info'
      );

      // Update performance metrics
      performanceMonitor.updateMetrics({
        maintenance: {
          mode: 'normal',
          lastEntered: null,
          lastExited: new Date().toISOString(),
          recoveryAttempts: 0,
          recoverySuccess: 0,
          recoveryFailures: 0,
          notifications: 1,
          currentStatus: 'inactive',
          lastMessage: 'System recovered',
          lastNotification: new Date().toISOString(),
          circuitBreaker: {
            state: 'closed',
            failureCount: 0,
            lastFailure: null,
            lastSuccess: null,
            resetTimeout: 30000
          }
        }
      });

      // Remove maintenance mode from Redis
      await redisManager.delete('system:maintenance');

      console.log('System exited maintenance mode');
    } catch (error: unknown) {
      console.error('Failed to exit maintenance mode:', error);
      securityAuditService.logSystemEvent(
        'maintenance_mode_failure',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'critical'
      );
    }
  }

  public async shutdown(): Promise<void> {
    try {
      this.shutdownInProgress = true;
      
      // Notify clients about shutdown
      try {
        await websocketServer.broadcastMaintenanceMode('inactive', 'System is shutting down');
      } catch (error) {
        console.error('Failed to notify WebSocket clients:', error);
      }

      // Log shutdown
      securityAuditService.logSystemEvent(
        'system_shutdown',
        { reason: 'System shutdown initiated' },
        'info'
      );

      // Update metrics
      performanceMonitor.updateMetrics({
        maintenance: {
          mode: 'normal',
          lastEntered: null,
          lastExited: new Date().toISOString(),
          recoveryAttempts: 0,
          recoverySuccess: 0,
          recoveryFailures: 0,
          notifications: 1,
          currentStatus: 'inactive',
          lastMessage: 'System shutdown',
          lastNotification: new Date().toISOString(),
          circuitBreaker: {
            state: 'closed',
            failureCount: 0,
            lastFailure: null,
            lastSuccess: null,
            resetTimeout: 30000
          }
        }
      });

      // Set maintenance mode in Redis
      await redisManager.set('system:maintenance', JSON.stringify({
        active: true,
        reason: 'System shutdown',
        timestamp: new Date().toISOString()
      }), 3600);

      // Wait for any pending operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('System shutdown completed');
    } catch (error: unknown) {
      console.error('Failed during shutdown:', error);
      securityAuditService.logSystemEvent(
        'system_shutdown_failure',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'critical'
      );
    } finally {
      this.shutdownInProgress = false;
    }
  }

  public async attemptRecovery(): Promise<boolean> {
    try {
      if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
        return false;
      }

      this.recoveryAttempts++;

      // Log recovery attempt
      securityAuditService.logSystemEvent(
        'maintenance_recovery_attempt',
        { attempt: this.recoveryAttempts },
        'info'
      );

      // Try to recover services
      await this.recoverServices();

      // If recovery was successful, exit maintenance mode
      if (!this.isMaintenanceMode) {
        await this.exitMaintenanceMode();
        return true;
      }

      return false;
    } catch (error: unknown) {
      console.error('Recovery attempt failed:', error);
      securityAuditService.logSystemEvent(
        'maintenance_recovery_failure',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'critical'
      );
      return false;
    }
  }

  private async recoverServices(): Promise<void> {
    try {
      // Check and recover Redis connection
      if (!redisManager.isConnected) {
        await redisManager.connect();
      }

      // Check and recover WebSocket server
      try {
        // Notify clients about the restart
        await websocketServer.broadcastMaintenanceMode('inactive', 'WebSocket server is restarting');
        
        // Close existing connections
        websocketServer.close();
        
        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reinitialize the server
        websocketServer.wss = new WebSocketServer({ server: websocketServer.wss.server });
        websocketServer.setupEventHandlers();
      } catch (error) {
        console.error('Failed to recover WebSocket server:', error);
      }

      // Check and recover other services as needed
      // Add more service recovery logic here
    } catch (error: unknown) {
      throw new Error(`Service recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const maintenanceService = MaintenanceService.getInstance();
