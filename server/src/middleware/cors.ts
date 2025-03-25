import cors from 'cors';
import { Logger } from '../utils/logger';

const logger = new Logger('CORS');

export const corsMiddleware = cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: process.env.CORS_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: process.env.CORS_HEADERS?.split(',') || ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
});

export const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (process.env.NODE_ENV === 'development' || 
        !origin || 
        origin === process.env.CORS_ORIGIN) {
      callback(null, true);
    } else {
      logger.warn(`CORS request denied from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  }
};
