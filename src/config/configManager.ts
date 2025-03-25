import dotenv from 'dotenv';
import { Logger } from '../utils/logger';

dotenv.config();

export interface Config {
  server: {
    port: number;
  };
  cors: {
    origin: string;
    methods: string;
    headers: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    sessionSecret: string;
  };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
    password: string;
  };
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
  monitoring: {
    enabled: boolean;
    interval: number;
  };
  log: {
    level: string;
    file: string;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Config;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('ConfigManager');
    this.config = {
      server: {
        port: parseInt(process.env.PORT || '3000'),
      },
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS',
        headers: process.env.CORS_HEADERS || 'Content-Type,Authorization',
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '15000'),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      },
      security: {
        jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
        sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-key',
      },
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        name: process.env.DB_NAME || 'religious_community_hub',
        user: process.env.DB_USER || 'appuser',
        password: process.env.DB_PASSWORD || '',
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || '',
      },
      email: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      monitoring: {
        enabled: process.env.MONITORING_ENABLED === 'true',
        interval: parseInt(process.env.MONITORING_INTERVAL || '60000'),
      },
      log: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || './logs/app.log',
      },
    };

    this.validateConfig();
  }

  private validateConfig() {
    const requiredEnvVars = [
      'JWT_SECRET',
      'SESSION_SECRET',
      'DB_HOST',
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD',
      'REDIS_HOST',
      'REDIS_PORT',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS',
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getConfig(): Config {
    return this.config;
  }

  public get<T extends keyof Config>(section: T): Config[T] {
    return this.config[section];
  }

  public getServerPort(): number {
    return this.config.server.port;
  }

  public getCorsConfig(): Config['cors'] {
    return this.config.cors;
  }

  public getRateLimitConfig(): Config['rateLimit'] {
    return this.config.rateLimit;
  }

  public getSecurityConfig(): Config['security'] {
    return this.config.security;
  }

  public getDatabaseConfig(): Config['database'] {
    return this.config.database;
  }

  public getRedisConfig(): Config['redis'] {
    return this.config.redis;
  }

  public getEmailConfig(): Config['email'] {
    return this.config.email;
  }

  public getMonitoringConfig(): Config['monitoring'] {
    return this.config.monitoring;
  }

  public getLogConfig(): Config['log'] {
    return this.config.log;
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance().getConfig();
