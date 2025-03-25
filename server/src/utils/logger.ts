import winston from 'winston';

interface LoggerContext {
  ip?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

export class Logger {
  private readonly logger: winston.Logger;

  constructor(private readonly context: string) {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
      ]
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  private formatMessage(message: string): string {
    return `${this.context}: ${message}`;
  }

  public info(message: string, context?: LoggerContext): void {
    this.logger.info(this.formatMessage(message), context);
  }

  public warn(message: string, context?: LoggerContext): void {
    this.logger.warn(this.formatMessage(message), context);
  }

  public error(message: string, context?: LoggerContext): void {
    this.logger.error(this.formatMessage(message), context);
  }

  public debug(message: string, context?: LoggerContext): void {
    this.logger.debug(this.formatMessage(message), context);
  }
}
