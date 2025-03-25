export interface DatabaseConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  name: string;
  dialect: 'mysql' | 'postgres' | 'sqlite' | 'mariadb';
}

export interface SecurityConfig {
  jwt: {
    secret: string;
    expiresIn: string;
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
      sameSite: 'strict' | 'lax' | 'none';
    };
  };
  rateLimit: {
    windowMs: number;
    max: number;
    standardHeaders: boolean;
    legacyHeaders: boolean;
  };
}

export interface ApiConfig {
  version: string;
  baseUrl: string;
  prefix: string;
  responseTimeThreshold: number;
}

export interface ServerConfig {
  port: number;
  environment: 'development' | 'production' | 'test';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface CorsConfig {
  origin: string;
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
}

export interface LanguageConfig {
  default: string;
  supported: string[];
}

export interface Config {
  database: DatabaseConfig;
  security: SecurityConfig;
  api: ApiConfig;
  server: ServerConfig;
  cors: CorsConfig;
  language: LanguageConfig;
}
