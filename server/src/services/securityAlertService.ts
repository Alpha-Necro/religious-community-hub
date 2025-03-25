import { getEnvironment } from '../config/environment';

export class SecurityAlertService {
  private readonly alertThreshold: number = 10; // Maximum alerts per minute
  private readonly alertWindowMs: number = 60000; // 1 minute window
  private alertCount: number = 0;
  private lastAlertTime: number = 0;

  constructor() {
    this.initializeAlertRateLimiter();
  }

  private initializeAlertRateLimiter(): void {
    setInterval(() => {
      this.alertCount = 0;
      this.lastAlertTime = Date.now();
    }, this.alertWindowMs);
  }

  public async sendAlert(title: string, message: string): Promise<void> {
    try {
      if (this.isRateLimited()) {
        throw new Error('Rate limit exceeded for security alerts');
      }

      const alert = {
        title,
        message,
        timestamp: new Date().toISOString(),
        environment: getEnvironment().nodeEnv
      };

      // In a real application, this would send alerts to monitoring systems,
      // email notifications, or other alerting mechanisms
      console.error('SECURITY ALERT:', alert);

      this.alertCount++;
    } catch (error) {
      console.error('Failed to send security alert:', error);
      throw error;
    }
  }

  private isRateLimited(): boolean {
    const currentTime = Date.now();
    const timeSinceLastAlert = currentTime - this.lastAlertTime;

    if (timeSinceLastAlert >= this.alertWindowMs) {
      this.alertCount = 0;
      this.lastAlertTime = currentTime;
    }

    return this.alertCount >= this.alertThreshold;
  }
}

export const securityAlertService = new SecurityAlertService();
