import { Request, Response, NextFunction } from 'express';
import { maintenanceService } from '../services/maintenanceService';

export const maintenanceMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (maintenanceService.isInMaintenanceMode()) {
      // Check if user is an admin (you might want to implement proper auth check)
      const isAdmin = req.headers.authorization?.includes('admin') ?? false;

      if (!isAdmin) {
        // Return maintenance mode response
        res.status(503).json({
          status: 'maintenance',
          message: 'The system is currently undergoing maintenance. Please try again later.',
          timestamp: new Date().toISOString()
        });
        return;
      }
    }

    next();
  } catch (error) {
    console.error('Maintenance middleware error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
