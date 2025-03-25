import { Logger } from '../utils/logger';

const logger = new Logger('ConfigManager');

interface Config {
  [key: string]: any;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    dialect: string;
  };
  security: {
    jwt: {
      secret: string;
      expiresIn: string;
      refreshSecret: string;
    };
    password: {
      minLength: number;
      maxLength: number;
      requireLowercase: boolean;
      requireUppercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
    csrf: {
      cookie: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: 'lax' | 'strict' | 'none';
      };
    };
    rateLimit: {
      windowMs: number;
      max: number;
      standardHeaders: boolean;
      legacyHeaders: boolean;
    };
    headers: {
      csp: string;
      referrerPolicy: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
      contentSecurityPolicy: string;
      xssProtection: string;
      frameOptions: string;
      strictTransportSecurity: string;
      permittedCrossDomainPolicies: string;
      xContentTypeOptions: string;
      xFrameOptions: string;
      xXssProtection: string;
      xPermittedCrossDomainPolicies: string;
    };
  };
  api: {
    version: string;
    baseUrl: string;
    prefix: string;
    responseTimeThreshold: number;
  };
  server: {
    port: number;
    environment: string;
    logLevel: string;
  };
  cors: {
    origin: string;
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
  };
  language: {
    default: string;
    supported: string[];
  };
}

export class ConfigManager {
  private config: Config;

  constructor() {
    this.config = {} as Config;
    this.initializeConfig();
  }

  private initializeConfig(): void {
    const environment = process.env.NODE_ENV || 'development';
    
    try {
      this.config = {
        database: {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          name: process.env.DB_NAME || 'religious_community_hub',
          user: process.env.DB_USER || 'appuser',
          password: process.env.DB_PASSWORD || '',
          dialect: 'postgres'
        },
        security: {
          jwt: {
            secret: process.env.JWT_SECRET || 'your-secret-key',
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret'
          },
          password: {
            minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
            maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || '100'),
            requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
            requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
            requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === 'true',
            requireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS === 'true'
          },
          csrf: {
            cookie: {
              httpOnly: process.env.CSRF_COOKIE_HTTP_ONLY === 'true',
              secure: process.env.CSRF_COOKIE_SECURE === 'true',
              sameSite: (process.env.CSRF_COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax'
            }
          },
          rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '15000'),
            max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
            standardHeaders: process.env.RATE_LIMIT_STANDARD_HEADERS === 'true',
            legacyHeaders: process.env.RATE_LIMIT_LEGACY_HEADERS === 'true'
          },
          headers: {
            csp: process.env.SECURITY_HEADERS_CSP || "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self';",
            referrerPolicy: (process.env.SECURITY_HEADERS_REFERRER_POLICY as Config['security']['headers']['referrerPolicy']) || 'no-referrer-when-downgrade',
            contentSecurityPolicy: process.env.SECURITY_HEADERS_CONTENT_TYPE_OPTIONS || 'nosniff',
            xssProtection: process.env.SECURITY_HEADERS_XSS_PROTECTION || '1; mode=block',
            frameOptions: process.env.SECURITY_HEADERS_FRAME_OPTIONS || 'SAMEORIGIN',
            strictTransportSecurity: process.env.SECURITY_HEADERS_STRICT_TRANSPORT_SECURITY || 'max-age=31536000; includeSubDomains; preload',
            permittedCrossDomainPolicies: process.env.SECURITY_HEADERS_PERMITTED_CROSS_DOMAIN_POLICIES || 'none',
            xContentTypeOptions: process.env.SECURITY_HEADERS_X_CONTENT_TYPE_OPTIONS || 'nosniff',
            xFrameOptions: process.env.SECURITY_HEADERS_X_FRAME_OPTIONS || 'DENY',
            xXssProtection: process.env.SECURITY_HEADERS_X_XSS_PROTECTION || '1; mode=block',
            xPermittedCrossDomainPolicies: process.env.SECURITY_HEADERS_X_PERMITTED_CROSS_DOMAIN_POLICIES || 'none'
          }
        },
        api: {
          version: process.env.API_VERSION || '1.0.0',
          baseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
          prefix: process.env.API_PREFIX || '/api',
          responseTimeThreshold: parseInt(process.env.API_RESPONSE_TIME_THRESHOLD || '100')
        },
        server: {
          port: parseInt(process.env.PORT || '3000'),
          environment: environment,
          logLevel: process.env.LOG_LEVEL || 'info'
        },
        cors: {
          origin: process.env.CLIENT_URL || 'http://localhost:3000',
          credentials: process.env.CORS_CREDENTIALS === 'true',
          methods: (process.env.CORS_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) as string[],
          allowedHeaders: (process.env.CORS_HEADERS?.split(',') || ['Content-Type', 'Authorization', 'X-CSRF-Token']) as string[]
        },
        language: {
          default: process.env.LANGUAGE_DEFAULT || 'en',
          supported: (process.env.LANGUAGE_SUPPORTED?.split(',') || ['en', 'fr']) as string[]
        }
      };

      // Validate required configurations
      this.validateConfig();
      logger.info('Configuration initialized successfully', { environment });
    } catch (error) {
      logger.error('Configuration initialization failed', { error });
      throw error;
    }
  }

  private validateConfig(): void {
    const requiredConfigs = [
      'database.host',
      'database.name',
      'database.user',
      'security.jwt.secret',
      'security.jwt.refreshSecret',
      'server.environment'
    ];

    for (const configPath of requiredConfigs) {
      const value = this.getConfigValue(configPath);
      if (!value) {
        throw new Error(`Missing required configuration: ${configPath}`);
      }
    }
  }

  private getConfigValue(path: string): any {
    return path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined), this.config);
  }

  public get(): Config {
    return this.config;
  }

  public getDatabaseConfig(): Config['database'] {
    return this.config.database;
  }

  public getSecurityConfig(): Config['security'] {
    return this.config.security;
  }

  public getApiConfig(): Config['api'] {
    return this.config.api;
  }

  public getServerConfig(): Config['server'] {
    return this.config.server;
  }

  public getCorsConfig(): Config['cors'] {
    return this.config.cors;
  }

  public getLanguageConfig(): Config['language'] {
    return this.config.language;
  }
}

// Export a singleton instance
export const config = new ConfigManager().get();
