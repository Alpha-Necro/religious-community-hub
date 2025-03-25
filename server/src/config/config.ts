import 'dotenv/config';
import { Sequelize, DataTypes } from 'sequelize';
import { ConfigManager } from '../configManager';

/**
 * Interface for database configuration.
 * @interface DatabaseConfig
 */
interface DatabaseConfig {
  /**
   * Hostname or IP address of the database server.
   */
  host: string;
  /**
   * Port number of the database server.
   */
  port: number;
  /**
   * Name of the database.
   */
  name: string;
  /**
   * Username for database authentication.
   */
  user: string;
  /**
   * Password for database authentication.
   */
  password: string;
  /**
   * Dialect of the database (e.g. 'mysql', 'postgres', etc.).
   */
  dialect: string;
}

/**
 * Interface for security configuration.
 * @interface SecurityConfig
 */
interface SecurityConfig {
  /**
   * Configuration for JSON Web Tokens (JWT).
   */
  jwt: {
    /**
     * Secret key for signing JWTs.
     */
    secret: string;
    /**
     * Expiration time for JWTs (e.g. '7d' for 7 days).
     */
    expiresIn: string;
  };
  /**
   * Configuration for password requirements.
   */
  password: {
    /**
     * Minimum length of passwords.
     */
    minLength: number;
    /**
     * Maximum length of passwords.
     */
    maxLength: number;
    /**
     * Whether passwords must contain at least one lowercase letter.
     */
    requireLowercase: boolean;
    /**
     * Whether passwords must contain at least one uppercase letter.
     */
    requireUppercase: boolean;
    /**
     * Whether passwords must contain at least one number.
     */
    requireNumbers: boolean;
    /**
     * Whether passwords must contain at least one symbol.
     */
    requireSymbols: boolean;
  };
  /**
   * Configuration for CSRF protection.
   */
  csrf: {
    /**
     * Configuration for CSRF cookies.
     */
    cookie: {
      /**
       * Whether CSRF cookies should be HTTP-only.
       */
      httpOnly: boolean;
      /**
       * Whether CSRF cookies should be secure (i.e. transmitted over HTTPS).
       */
      secure: boolean;
      /**
       * Same-site policy for CSRF cookies (e.g. 'strict', 'lax', etc.).
       */
      sameSite: string;
    };
  };
  /**
   * Configuration for rate limiting.
   */
  rateLimit: {
    /**
     * Time window for rate limiting (e.g. 15 minutes).
     */
    windowMs: number;
    /**
     * Maximum number of requests allowed within the time window.
     */
    max: number;
    /**
     * Whether to include rate limit information in response headers.
     */
    standardHeaders: boolean;
    /**
     * Whether to include legacy rate limit headers.
     */
    legacyHeaders: boolean;
  };
}

/**
 * Interface for API configuration.
 * @interface ApiConfig
 */
interface ApiConfig {
  /**
   * Version number of the API.
   */
  version: string;
  /**
   * Base URL of the API.
   */
  baseUrl: string;
  /**
   * Prefix for API routes.
   */
  prefix: string;
}

/**
 * Interface for server configuration.
 * @interface ServerConfig
 */
interface ServerConfig {
  /**
   * Port number of the server.
   */
  port: number;
  /**
   * Environment of the server (e.g. 'development', 'production', etc.).
   */
  environment: string;
  /**
   * Log level of the server (e.g. 'debug', 'info', etc.).
   */
  logLevel: string;
}

/**
 * Interface for CORS configuration.
 * @interface CorsConfig
 */
interface CorsConfig {
  /**
   * Origin URL for CORS requests.
   */
  origin: string;
  /**
   * Whether to include credentials in CORS requests.
   */
  credentials: boolean;
  /**
   * List of allowed HTTP methods for CORS requests.
   */
  methods: string[];
  /**
   * List of allowed HTTP headers for CORS requests.
   */
  allowedHeaders: string[];
}

/**
 * Interface for language configuration.
 * @interface LanguageConfig
 */
interface LanguageConfig {
  /**
   * Default language of the application.
   */
  default: string;
  /**
   * Supported languages of the application.
   */
  supported: string[];
}

/**
 * Interface for the main configuration object.
 * @interface Config
 */
interface Config {
  /**
   * Database configuration.
   */
  database: DatabaseConfig;
  /**
   * Security configuration.
   */
  security: SecurityConfig;
  /**
   * API configuration.
   */
  api: ApiConfig;
  /**
   * Server configuration.
   */
  server: ServerConfig;
  /**
   * CORS configuration.
   */
  cors: CorsConfig;
  /**
   * Language configuration.
   */
  language: LanguageConfig;
  /**
   * Sequelize instance.
   */
  sequelize: Sequelize;
  /**
   * Sequelize constructor.
   */
  Sequelize: typeof Sequelize;
}

const configManager = new ConfigManager();
await configManager.loadConfig();

const config: Config = {
  database: {
    ...configManager.get('database') as any,
    logging: process.env.NODE_ENV !== 'production' ? console.log : false
  },
  security: configManager.get('security') as any,
  api: configManager.get('api') as any,
  server: configManager.get('server') as any,
  cors: configManager.get('cors') as any,
  language: configManager.get('language') as any,
  sequelize: new Sequelize(
    configManager.get('database.name') as string,
    configManager.get('database.user') as string,
    configManager.get('database.password') as string,
    {
      host: configManager.get('database.host') as string,
      port: configManager.get('database.port') as number,
      dialect: 'mysql',
      logging: process.env.NODE_ENV !== 'production' ? console.log : false
    }
  ),
  Sequelize,
};

export default config;
