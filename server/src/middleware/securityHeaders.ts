import { RequestHandler } from 'express';

export const securityHeaders: RequestHandler = (req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  const csp = [
    "default-src 'self';",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.cloudflare.com https://*.googleapis.com;",
    "style-src 'self' 'unsafe-inline' https://*.cloudflare.com https://*.googleapis.com;",
    "img-src 'self' data: https:;",
    "font-src 'self' https: data:;",
    "connect-src 'self' wss:;",
    "object-src 'none';",
    "base-uri 'self';",
    "form-action 'self';",
    "frame-ancestors 'none';",
    'sandbox allow-forms allow-scripts allow-same-origin;',
  ].join(' ');

  res.setHeader('Content-Security-Policy', csp);

  // Strict Transport Security
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Feature Policy
  res.setHeader(
    'Feature-Policy',
    ["geolocation 'none';", "microphone 'none';", "camera 'none';", "speaker 'none';"].join(' '),
  );

  // Permissions Policy (replacement for Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    ['geolocation=()', 'microphone=()', 'camera=()', 'speaker=()'].join(', '),
  );

  next();
};
