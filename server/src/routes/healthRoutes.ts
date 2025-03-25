import express from 'express';
import { maintenanceService } from '../services/maintenanceService';
import { performanceMonitor } from '../services/performanceMonitor';
import { securityAuditService } from '../services/securityAuditService';

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        redis: await maintenanceService.checkSystemHealth(),
        maintenance: {
          active: maintenanceService.isInMaintenanceMode(),
          recoveryAttempts: maintenanceService['recoveryAttempts']
        }
      },
      metrics: performanceMonitor.getMetrics()
    };

    res.json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    securityAuditService.logSystemEvent(
      'health_check_failure',
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'error'
    );
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
