import { Server } from 'http';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { monitoringService } from './monitoringService';

interface ShutdownOptions {
  timeout?: number;
  reason?: string;
  notifyUsers?: boolean;
}

export class ShutdownManager extends EventEmitter {
  private server: Server;
  private isShuttingDown = false;
  private shutdownTimeout: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    super();
    this.server = server;
  }

  async gracefulShutdown(options: ShutdownOptions = {}): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    const { timeout = 30000, reason = 'System maintenance', notifyUsers = true } = options;
    this.isShuttingDown = true;

    try {
      // Notify monitoring service
      monitoringService.trackShutdown(reason);

      // Notify users if enabled
      if (notifyUsers) {
        await this.notifyUsers(reason);
      }

      // Close server connections
      logger.info('Initiating graceful shutdown...');
      this.server.close(async (err) => {
        if (err) {
          logger.error('Error during server shutdown:', err);
          await this.handleShutdownError(err);
        }

        // Wait for active connections to close
        await this.waitForConnections(timeout);

        // Clean up resources
        await this.cleanup();

        logger.info('Shutdown complete');
        this.emit('shutdownComplete');
      });

      // Set timeout in case shutdown takes too long
      this.shutdownTimeout = setTimeout(() => {
        logger.warn('Shutdown timeout reached, forcing shutdown');
        process.exit(1);
      }, timeout);

    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      await this.handleShutdownError(error);
    }
  }

  private async notifyUsers(reason: string): Promise<void> {
    // TODO: Implement user notification system
    logger.info(`Notifying users of shutdown: ${reason}`);
  }

  private async waitForConnections(timeout: number): Promise<void> {
    // TODO: Implement connection waiting logic
    logger.info(`Waiting for active connections to close (timeout: ${timeout}ms)`);
  }

  private async cleanup(): Promise<void> {
    // TODO: Implement resource cleanup
    logger.info('Cleaning up resources...');
  }

  private async handleShutdownError(error: Error): Promise<void> {
    // Log error and notify monitoring service
    monitoringService.trackShutdownError(error);
    logger.error('Shutdown error:', error);
  }

  cancelShutdown(): void {
    if (this.shutdownTimeout) {
      clearTimeout(this.shutdownTimeout);
      this.shutdownTimeout = null;
    }
    this.isShuttingDown = false;
    logger.info('Shutdown cancelled');
  }

  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }
}

export const shutdownManager = new ShutdownManager(null as unknown as Server);
