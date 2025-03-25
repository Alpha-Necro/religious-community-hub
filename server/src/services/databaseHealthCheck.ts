import { Sequelize } from 'sequelize';
import { performanceMonitor } from './performanceMonitor';
import { securityAlertService } from '../services/securityAlertService';
import { getEnvironment, isProduction } from '../config/environment';

export class DatabaseHealthCheck {
  private sequelize: Sequelize;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs = 30000; // 30 seconds

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
  }

  public async startHealthCheck(): Promise<void> {
    if (this.checkInterval) {
      return;
    }

    try {
      await this.validateConnection();
      this.checkInterval = setInterval(() => this.validateConnection(), this.checkIntervalMs);
    } catch (error) {
      await this.handleConnectionError(error);
    }
  }

  public stopHealthCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  public async validateConnection(): Promise<void> {
    try {
      const startTime = performance.now();
      await this.sequelize.authenticate();
      const responseTime = performance.now() - startTime;

      performanceMonitor.updateMetrics({
        database: {
          responseTime,
          status: 'healthy'
        }
      });

      if (isProduction()) {
        await this.checkDatabaseHealth(responseTime);
      }
    } catch (error) {
      await this.handleConnectionError(error);
    }
  }

  private async checkDatabaseHealth(responseTime: number): Promise<void> {
    const threshold = 1000; // 1 second threshold
    if (responseTime > threshold) {
      await securityAlertService.sendAlert(
        'Database Performance Alert',
        `Database response time exceeded 1 second: ${responseTime}ms`
      );
    }
  }

  private async handleConnectionError(error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database connection error';
    
    await securityAlertService.sendAlert(
      'Database Connection Error',
      errorMessage
    );

    performanceMonitor.updateMetrics({
      database: {
        status: 'unhealthy',
        responseTime: 0
      }
    });

    throw new Error(`Database connection error: ${errorMessage}`);
  }
}

export const databaseHealthCheck = new DatabaseHealthCheck(new Sequelize(getEnvironment().databaseUrl, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
}));
