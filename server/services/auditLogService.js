const AuditLog = require('../models/AuditLog');
const { ApiError } = require('../middleware/errorHandler');

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
  }) {
    try {
      const where = {};

      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (entity) where.entity = entity;

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
