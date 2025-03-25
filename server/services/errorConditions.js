const errorConditions = {
  // System Level Errors
  CRITICAL_SYSTEM_ERROR: {
    patterns: ['critical system error', 'system failure', 'kernel panic'],
    maintenanceType: 'SYSTEM_MAINTENANCE',
    threshold: 1,
    priority: 'high',
  },

  // Database Errors
  DATABASE_ERROR: {
    patterns: ['database connection', 'query failed', 'timeout', 'deadlock'],
    maintenanceType: 'DATABASE_MAINTENANCE',
    threshold: 3,
    priority: 'high',
  },

  // Authentication Errors
  AUTH_ERROR: {
    patterns: ['authentication failed', 'token expired', 'session timeout'],
    maintenanceType: 'SYSTEM_MAINTENANCE',
    threshold: 5,
    priority: 'medium',
  },

  // Rate Limiting Errors
  RATE_LIMIT_ERROR: {
    patterns: ['rate limit exceeded', 'too many requests', '429'],
    maintenanceType: 'SYSTEM_MAINTENANCE',
    threshold: 10,
    priority: 'medium',
  },

  // External Service Errors
  EXTERNAL_SERVICE_ERROR: {
    patterns: ['external service', 'API call failed', 'service unavailable'],
    maintenanceType: 'SYSTEM_MAINTENANCE',
    threshold: 5,
    priority: 'medium',
  },

  // Resource Errors
  MEMORY_ERROR: {
    patterns: ['out of memory', 'memory leak', 'heap overflow'],
    maintenanceType: 'SYSTEM_MAINTENANCE',
    threshold: 1,
    priority: 'high',
  },

  CPU_ERROR: {
    patterns: ['CPU usage', 'high load', 'process killed'],
    maintenanceType: 'SYSTEM_MAINTENANCE',
    threshold: 1,
    priority: 'high',
  },

  DISK_ERROR: {
    patterns: ['disk space', 'storage full', 'inode limit'],
    maintenanceType: 'SYSTEM_MAINTENANCE',
    threshold: 1,
    priority: 'high',
  },

  NETWORK_ERROR: {
    patterns: ['network error', 'connection refused', 'timeout'],
    maintenanceType: 'SYSTEM_MAINTENANCE',
    threshold: 5,
    priority: 'medium',
  },

  // Security Errors
  SSL_ERROR: {
    patterns: ['SSL error', 'certificate', 'handshake failed'],
    maintenanceType: 'SECURITY_UPDATE',
    threshold: 1,
    priority: 'high',
  },

  FILE_SYSTEM_ERROR: {
    patterns: ['file system error', 'permission denied', 'file not found'],
    maintenanceType: 'SYSTEM_MAINTENANCE',
    threshold: 3,
    priority: 'medium',
  },

  CONFIG_ERROR: {
    patterns: ['configuration error', 'invalid config', 'missing setting'],
    maintenanceType: 'SYSTEM_MAINTENANCE',
    threshold: 1,
    priority: 'high',
  },

  VERSION_ERROR: {
    patterns: ['version mismatch', 'incompatible version', 'upgrade required'],
    maintenanceType: 'UPGRADE',
    threshold: 1,
    priority: 'high',
  },

  // Infrastructure Errors
  INFRASTRUCTURE_ERROR: {
    patterns: ['infrastructure error', 'resource limit', 'capacity exceeded'],
    maintenanceType: 'SYSTEM_MAINTENANCE',
    threshold: 1,
    priority: 'high',
  },

  CLOUD_ERROR: {
    patterns: ['cloud provider error', 'API limit', 'quota exceeded'],
    maintenanceType: 'SYSTEM_MAINTENANCE',
    threshold: 1,
    priority: 'high',
  },

  // Performance Errors
  PERFORMANCE_ERROR: {
    patterns: ['performance degradation', 'slow response', 'high latency'],
    maintenanceType: 'SYSTEM_MAINTENANCE',
    threshold: 10,
    priority: 'medium',
  },

  // Validation Errors
  VALIDATION_ERROR: {
    patterns: ['validation failed', 'invalid data', 'constraint violation'],
    maintenanceType: 'SYSTEM_MAINTENANCE',
    threshold: 5,
    priority: 'medium',
  },

  // Custom Error Types
  CUSTOM_ERRORS: {
    patterns: [], // Will be populated by custom error types
    maintenanceType: 'SYSTEM_MAINTENANCE',
    threshold: 1,
    priority: 'high',
  },
};

// Helper functions to check error conditions
const checkErrorCondition = (error, condition) => {
  return condition.patterns.some(pattern => 
    error.message.toLowerCase().includes(pattern)
  );
};

const getHighestPriorityCondition = (error) => {
  let highestPriorityCondition = null;
  let highestPriority = 'low';

  Object.entries(errorConditions).forEach(([key, condition]) => {
    if (checkErrorCondition(error, condition)) {
      if (condition.priority === 'high' || 
          (condition.priority === 'medium' && highestPriority === 'low')) {
        highestPriorityCondition = condition;
        highestPriority = condition.priority;
      }
    }
  });

  return highestPriorityCondition;
};

module.exports = {
  errorConditions,
  checkErrorCondition,
  getHighestPriorityCondition,
};
