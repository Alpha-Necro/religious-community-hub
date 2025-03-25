import dotenv from 'dotenv';

dotenv.config();

export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DB_DIALECT: 'postgres';
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  SENTRY_DSN: string;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX: number;
  SESSION_SECRET: string;
  SESSION_COOKIE_NAME: string;
  SESSION_COOKIE_MAX_AGE: number;
  SESSION_COOKIE_SECURE: boolean;
  SESSION_COOKIE_HTTP_ONLY: boolean;
  SESSION_COOKIE_SAME_SITE: 'lax' | 'strict' | 'none';
}

export function getEnvironment(): Environment {
  const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    DB_DIALECT: process.env.DB_DIALECT || 'postgres',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
    DB_NAME: process.env.DB_NAME || 'religious_community_hub',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
    SENTRY_DSN: process.env.SENTRY_DSN || '',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS) : 15 * 60 * 1000,
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 100,
    SESSION_SECRET: process.env.SESSION_SECRET || 'your-session-secret',
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME || 'rhub_session',
    SESSION_COOKIE_MAX_AGE: process.env.SESSION_COOKIE_MAX_AGE ? parseInt(process.env.SESSION_COOKIE_MAX_AGE) : 24 * 60 * 60 * 1000,
    SESSION_COOKIE_SECURE: process.env.SESSION_COOKIE_SECURE === 'true',
    SESSION_COOKIE_HTTP_ONLY: process.env.SESSION_COOKIE_HTTP_ONLY === 'true',
    SESSION_COOKIE_SAME_SITE: process.env.SESSION_COOKIE_SAME_SITE || 'lax'
  };

  // Validate required environment variables
  const requiredVars = ['JWT_SECRET', 'SESSION_SECRET'];
  const missingVars = requiredVars.filter(varName => !env[varName as keyof Environment]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return env;
}

export const isProduction = (): boolean => {
  return getEnvironment().NODE_ENV === 'production';
};

export const isTest = (): boolean => {
  return getEnvironment().NODE_ENV === 'test';
};

export const isDevelopment = (): boolean => {
  return getEnvironment().NODE_ENV === 'development';
};
