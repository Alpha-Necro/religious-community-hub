import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/configManager';
import { Logger } from '../utils/logger';
import { CustomError } from '../utils/errors';

const logger = new Logger('AuthMiddleware');

interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

enum AuthErrorCodes {
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  AUTH_ERROR = 'AUTH_ERROR',
  REFRESH_TOKEN_REQUIRED = 'REFRESH_TOKEN_REQUIRED',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
  REFRESH_TOKEN_ERROR = 'REFRESH_TOKEN_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED'
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization as string;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError(
        'Authentication required',
        AuthErrorCodes.AUTH_REQUIRED,
        401
      );
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.security.jwt.secret) as JwtPayload;
      req.user = { id: decoded.id };
      logger.info('Authentication successful', { userId: decoded.id });
      next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new CustomError(
          'Token has expired',
          AuthErrorCodes.TOKEN_EXPIRED,
          401
        );
      }
      throw new CustomError(
        'Invalid token',
        AuthErrorCodes.INVALID_TOKEN,
        401
      );
    }
  } catch (error: any) {
    logger.error('Authentication error', { error: error.message });
    
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({
        status: 'error',
        code: error.code,
        message: error.message
      });
    } else {
      res.status(500).json({
        status: 'error',
        code: AuthErrorCodes.AUTH_ERROR,
        message: 'Internal authentication error'
      });
    }
  }
};

// Refresh token middleware
export const refreshTokenMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken as string;
    
    if (!refreshToken) {
      throw new CustomError(
        'Refresh token required',
        AuthErrorCodes.REFRESH_TOKEN_REQUIRED,
        401
      );
    }

    try {
      const decoded = jwt.verify(refreshToken, config.security.jwt.refreshSecret) as JwtPayload;
      req.user = { id: decoded.id };
      logger.info('Refresh token verified', { userId: decoded.id });
      next();
    } catch (error: any) {
      throw new CustomError(
        'Invalid refresh token',
        AuthErrorCodes.INVALID_REFRESH_TOKEN,
        401
      );
    }
  } catch (error: any) {
    logger.error('Refresh token error', { error: error.message });
    
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({
        status: 'error',
        code: error.code,
        message: error.message
      });
    } else {
      res.status(500).json({
        status: 'error',
        code: AuthErrorCodes.REFRESH_TOKEN_ERROR,
        message: 'Internal refresh token error'
      });
    }
  }
};

// Error handler for auth middleware
export const authErrorHandler = (err: Error, req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  logger.error('Authentication error handler triggered', { error: err.message });
  
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      status: 'error',
      code: AuthErrorCodes.INVALID_TOKEN,
      message: 'Invalid token'
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      status: 'error',
      code: AuthErrorCodes.TOKEN_EXPIRED,
      message: 'Token has expired'
    });
    return;
  }

  res.status(500).json({
    status: 'error',
    code: AuthErrorCodes.AUTH_ERROR,
    message: 'Internal authentication error'
  });
};

export default {
  authMiddleware,
  refreshTokenMiddleware,
  authErrorHandler
};
