/**
 * Interface for database configuration.
 */
export interface DatabaseConfig {
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
 */
export interface SecurityConfig {
  /**
   * Configuration for JSON Web Tokens (JWT).
   */
  jwt: {
    /**
     * Secret key for signing JWTs.
     */
    secret: string;
    /**
     * Time to live (TTL) for JWTs.
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
   * Configuration for Cross-Site Request Forgery (CSRF) protection.
   */
  csrf: {
    /**
     * Whether CSRF protection is enabled.
     */
    enabled: boolean;
    /**
     * Name of the cookie used for CSRF protection.
     */
    cookieName: string;
  };
}

/**
 * Interface for cache configuration.
 */
export interface CacheConfig {
  /**
   * Whether caching is enabled.
   */
  enabled: boolean;
  /**
   * Provider for caching (either 'redis' or 'memory').
   */
  provider: 'redis' | 'memory';
  /**
   * Time to live (TTL) for cached items.
   */
  ttl: number;
  /**
   * Maximum number of items to cache.
   */
  maxItems: number;
}

/**
 * Interface for Content Delivery Network (CDN) configuration.
 */
export interface CdnConfig {
  /**
   * Whether CDN is enabled.
   */
  enabled: boolean;
  /**
   * Provider for CDN (either 'cloudflare', 'aws', or 'azure').
   */
  provider: 'cloudflare' | 'aws' | 'azure';
  /**
   * Domain name for CDN.
   */
  domain: string;
  /**
   * Time to live (TTL) for cached CDN assets.
   */
  cacheTtl: number;
}

/**
 * Interface for language configuration.
 */
export interface LanguageConfig {
  /**
   * Default language for the application.
   */
  default: string;
  /**
   * Supported languages for the application.
   */
  supported: string[];
}

/**
 * Interface for main application configuration.
 */
export interface Config {
  /**
   * Database configuration.
   */
  database: DatabaseConfig;
  /**
   * Security configuration.
   */
  security: SecurityConfig;
  /**
   * Cache configuration.
   */
  cache: CacheConfig;
  /**
   * CDN configuration.
   */
  cdn: CdnConfig;
  /**
   * Language configuration.
   */
  language: LanguageConfig;
  /**
   * Port number for the application server.
   */
  port: number;
  /**
   * Environment for the application (e.g. 'development', 'production', etc.).
   */
  environment: string;
  /**
   * Log level for the application (e.g. 'debug', 'info', 'error', etc.).
   */
  logLevel: string;
  /**
   * Version number of the application.
   */
  version: string;
}
