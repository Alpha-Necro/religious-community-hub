import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Application } from 'express';
import { config } from '../config/configManager';

interface SecurityConfig {
  securityHeaders: {
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
  cors: {
    origin: string;
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    message: string;
    standardHeaders: boolean;
    legacyHeaders: boolean;
  };
}

export function setupSecurity(app: Application) {
  const securityConfig: SecurityConfig = {
    securityHeaders: {
      csp: config.security.headers.csp,
      referrerPolicy: config.security.headers.referrerPolicy,
      contentSecurityPolicy: config.security.headers.contentSecurityPolicy,
      xssProtection: config.security.headers.xssProtection,
      frameOptions: config.security.headers.frameOptions,
      strictTransportSecurity: config.security.headers.strictTransportSecurity,
      permittedCrossDomainPolicies: config.security.headers.permittedCrossDomainPolicies,
      xContentTypeOptions: config.security.headers.xContentTypeOptions,
      xFrameOptions: config.security.headers.xFrameOptions,
      xXssProtection: config.security.headers.xXssProtection,
      xPermittedCrossDomainPolicies: config.security.headers.xPermittedCrossDomainPolicies
    },
    cors: {
      origin: config.cors.origin,
      methods: config.cors.methods,
      allowedHeaders: config.cors.allowedHeaders,
      credentials: config.cors.credentials
    },
    rateLimit: {
      windowMs: config.security.rateLimit.windowMs,
      max: config.security.rateLimit.max,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: config.security.rateLimit.standardHeaders,
      legacyHeaders: config.security.rateLimit.legacyHeaders
    }
  };

  // Set up security headers with configuration
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https:"],
        frameSrc: ["'none'"],
      },
      useDefaults: true
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    dnsPrefetchControl: false,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: false,
    referrerPolicy: { policy: securityConfig.securityHeaders.referrerPolicy },
    xssFilter: true,
  }));

  // Set up CORS with configuration
  app.use(cors(securityConfig.cors));

  // Set up rate limiting with configuration
  const limiter = rateLimit(securityConfig.rateLimit);
  app.use(limiter);

  // Add additional security headers
  app.use((_, res, next) => {
    res.setHeader('Content-Security-Policy', securityConfig.securityHeaders.csp);
    res.setHeader('Referrer-Policy', securityConfig.securityHeaders.referrerPolicy);
    res.setHeader('X-Content-Type-Options', securityConfig.securityHeaders.contentSecurityPolicy);
    res.setHeader('X-XSS-Protection', securityConfig.securityHeaders.xssProtection);
    res.setHeader('X-Frame-Options', securityConfig.securityHeaders.frameOptions);
    res.setHeader('Strict-Transport-Security', securityConfig.securityHeaders.strictTransportSecurity);
    res.setHeader('X-Permitted-Cross-Domain-Policies', securityConfig.securityHeaders.permittedCrossDomainPolicies);
    res.setHeader('X-Content-Type-Options', securityConfig.securityHeaders.xContentTypeOptions);
    res.setHeader('X-Frame-Options', securityConfig.securityHeaders.xFrameOptions);
    res.setHeader('X-XSS-Protection', securityConfig.securityHeaders.xXssProtection);
    res.setHeader('X-Permitted-Cross-Domain-Policies', securityConfig.securityHeaders.xPermittedCrossDomainPolicies);
    next();
  });
}
