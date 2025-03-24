const { Op } = require('sequelize');
const { auditLogService } = require('../services/auditLogService');

const startTimestamp = Date.now();

// Track database operations
const trackDatabaseOperations = (sequelize) => {
  const originalQuery = sequelize.query;
  const originalTransaction = sequelize.transaction;

  // Intercept query operations
  sequelize.query = async (...args) => {
    const start = Date.now();
    const query = args[0];
    const options = args[1] || {};

    try {
      const result = await originalQuery.apply(sequelize, args);
      
      await logDatabaseOperation({
        query,
        options,
        result,
        duration: Date.now() - start,
        status: 'SUCCESS',
        severity: 'INFO',
      });

      return result;
    } catch (error) {
      await logDatabaseOperation({
        query,
        options,
        error,
        duration: Date.now() - start,
        status: 'FAILED',
        severity: 'ERROR',
      });

      throw error;
    }
  };

  // Intercept transaction operations
  sequelize.transaction = async (...args) => {
    const start = Date.now();
    const options = args[0] || {};
    const callback = args[1];

    try {
      const result = await originalTransaction.apply(sequelize, args);
      
      await logDatabaseOperation({
        query: 'TRANSACTION',
        options,
        result,
        duration: Date.now() - start,
        status: 'SUCCESS',
        severity: 'INFO',
      });

      return result;
    } catch (error) {
      await logDatabaseOperation({
        query: 'TRANSACTION',
        options,
        error,
        duration: Date.now() - start,
        status: 'FAILED',
        severity: 'ERROR',
      });

      throw error;
    }
  };

  // Add hooks for model operations
  sequelize.models.forEach((model) => {
    model.beforeCreate(async (instance, options) => {
      await logDatabaseOperation({
        query: 'CREATE',
        options,
        model: model.name,
        data: instance.toJSON(),
        status: 'PENDING',
        severity: 'INFO',
      });
    });

    model.afterCreate(async (instance, options) => {
      await logDatabaseOperation({
        query: 'CREATE',
        options,
        model: model.name,
        data: instance.toJSON(),
        status: 'SUCCESS',
        severity: 'INFO',
      });
    });

    model.beforeUpdate(async (instance, options) => {
      await logDatabaseOperation({
        query: 'UPDATE',
        options,
        model: model.name,
        data: instance.toJSON(),
        status: 'PENDING',
        severity: 'INFO',
      });
    });

    model.afterUpdate(async (instance, options) => {
      await logDatabaseOperation({
        query: 'UPDATE',
        options,
        model: model.name,
        data: instance.toJSON(),
        status: 'SUCCESS',
        severity: 'INFO',
      });
    });

    model.beforeDestroy(async (instance, options) => {
      await logDatabaseOperation({
        query: 'DELETE',
        options,
        model: model.name,
        data: instance.toJSON(),
        status: 'PENDING',
        severity: 'WARNING',
      });
    });

    model.afterDestroy(async (instance, options) => {
      await logDatabaseOperation({
        query: 'DELETE',
        options,
        model: model.name,
        data: instance.toJSON(),
        status: 'SUCCESS',
        severity: 'WARNING',
      });
    });
  });
};

// Log database operation
const logDatabaseOperation = async ({
  query,
  options,
  result,
  error,
  duration,
  status,
  severity,
  model,
  data,
}) => {
  try {
    const logData = {
      action: getActionFromQuery(query),
      entity: model || 'Query',
      entityId: data?.id,
      description: getDescription(query, options, error),
      ipAddress: options?.ip || 'SYSTEM',
      userAgent: options?.userAgent || 'DATABASE',
      metadata: {
        query,
        options,
        result,
        error,
      },
      context: {
        transactionId: options?.transaction?.id,
        userId: options?.userId,
        environment: process.env.NODE_ENV,
      },
      severity,
      status,
      duration,
    };

    await auditLogService.logAction(logData);
  } catch (error) {
    console.error('Failed to log database operation:', error);
  }
};

// Get action type from query
const getActionFromQuery = (query) => {
  if (typeof query === 'string') {
    query = query.toLowerCase();
    if (query.includes('insert')) return 'DB_CREATE';
    if (query.includes('select')) return 'DB_READ';
    if (query.includes('update')) return 'DB_UPDATE';
    if (query.includes('delete')) return 'DB_DELETE';
  }
  return 'DB_TRANSACTION';
};

// Generate description for audit log
const getDescription = (query, options, error) => {
  if (error) {
    return `Database operation failed: ${error.message}`;
  }
  
  if (typeof query === 'string') {
    const queryType = getActionFromQuery(query);
    return `Executed ${queryType} query`;
  }
  
  return 'Executed database transaction';
};

module.exports = { trackDatabaseOperations };
