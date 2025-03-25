#!/usr/bin/env node

import { maintenanceService } from '../src/services/maintenanceService';
import { performanceMonitor } from '../src/services/performanceMonitor';
import { securityAuditService } from '../src/services/securityAuditService';
import { redisManager } from '../src/config/redis';

async function emergencyShutdown() {
  try {
    console.log('Starting emergency shutdown procedure...');

    // Log the emergency shutdown
    securityAuditService.logSystemEvent(
      'emergency_shutdown',
      { reason: 'Manual trigger' },
      'critical'
    );

    // Enter maintenance mode
    await maintenanceService.enterMaintenanceMode(
      new Error('Emergency shutdown initiated')
    );

    // Close all connections
    console.log('Closing Redis connection...');
    await redisManager.close();

    // Update performance metrics
    performanceMonitor.updateMetrics({
      emergency: {
        status: 'shutdown',
        timestamp: new Date().toISOString()
      }
    });

    console.log('Emergency shutdown completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Emergency shutdown failed:', error);
    securityAuditService.logSystemEvent(
      'emergency_shutdown_failure',
      { error: error.message },
      'critical'
    );
    process.exit(1);
  }
}

emergencyShutdown();
