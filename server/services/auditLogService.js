const AuditLog = require('../models/AuditLog');
const { ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

const auditLogService = {
  async logAction({
    userId,
    action,
    entity,
    entityId,
    description,
    ipAddress,
    userAgent,
    metadata,
    severity,
    category,
    correlationId,
  }) {
    try {
      const log = await AuditLog.create({
        userId,
        action,
        entity,
        entityId,
        description,
        ipAddress,
        userAgent,
        metadata,
        severity,
        category,
        correlationId,
      });

      // Log to console for monitoring (in production, this would go to a logging service)
      console.log(`Audit Log: ${action} - ${entity} - ${description}`);

      return log;
    } catch (error) {
      throw new ApiError(500, 'Failed to log audit action', [error.message]);
    }
  },

  async getLogs({
    userId,
    action,
    entity,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
    severity,
    category,
    correlationId,
  }) {
    try {
      const where = {};

      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (entity) where.entity = entity;
      if (severity) where.severity = severity;
      if (category) where.category = category;
      if (correlationId) where.correlationId = correlationId;

      if (startDate) {
        where.createdAt = {
          [Op.gte]: startDate,
        };
      }

      if (endDate) {
        if (!where.createdAt) {
          where.createdAt = {};
        }
        where.createdAt[Op.lte] = endDate;
      }

      const logs = await AuditLog.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      });

      return logs;
    } catch (error) {
      throw new ApiError(500, 'Failed to fetch audit logs', [error.message]);
    }
  },

  async getReport({
    userId,
    action,
    entity,
    startDate,
    endDate,
    severity,
    category,
    correlationId,
  }) {
    try {
      const where = {};

      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (entity) where.entity = entity;
      if (severity) where.severity = severity;
      if (category) where.category = category;
      if (correlationId) where.correlationId = correlationId;

      if (startDate) {
        where.createdAt = {
          [Op.gte]: startDate,
        };
      }

      if (endDate) {
        if (!where.createdAt) {
          where.createdAt = {};
        }
        where.createdAt[Op.lte] = endDate;
      }

      const logs = await AuditLog.findAll({
        where,
        attributes: [
          'userId',
          'action',
          'entity',
          'entityId',
          'description',
          'severity',
          'category',
          'correlationId',
          'createdAt',
        ],
        order: [['createdAt', 'DESC']],
      });

      const report = logs.map((log) => ({
        userId: log.userId,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        description: log.description,
        severity: log.severity,
        category: log.category,
        correlationId: log.correlationId,
        timestamp: log.createdAt,
      }));

      return report;
    } catch (error) {
      throw new ApiError(500, 'Failed to generate audit log report', [error.message]);
    }
  },

  async deleteOldLogs(olderThanDays = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await AuditLog.destroy({
        where: {
          createdAt: {
            [Op.lt]: cutoffDate,
          },
        },
      });

      return result;
    } catch (error) {
      throw new ApiError(500, 'Failed to delete old audit logs', [error.message]);
    }
  },
};

module.exports = auditLogService;
