const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  action: {
    type: DataTypes.ENUM(
      'CREATE',
      'READ',
      'UPDATE',
      'DELETE',
      'LOGIN',
      'LOGOUT',
      'PASSWORD_CHANGE',
      'ROLE_CHANGE',
      'PERMISSION_CHANGE',
      'DB_CREATE',
      'DB_READ',
      'DB_UPDATE',
      'DB_DELETE',
      'DB_TRANSACTION'
    ),
    allowNull: false,
  },
  entity: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  context: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional context about the operation (e.g., query parameters, transaction ID)',
  },
  severity: {
    type: DataTypes.ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL'),
    defaultValue: 'INFO',
  },
  status: {
    type: DataTypes.ENUM('SUCCESS', 'FAILED', 'PENDING'),
    defaultValue: 'SUCCESS',
  },
  duration: {
    type: DataTypes.INTEGER,
    comment: 'Operation duration in milliseconds',
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['action'] },
    { fields: ['entity'] },
    { fields: ['createdAt'] },
    { fields: ['severity'] },
    { fields: ['status'] },
  ]
});

// Add hooks for automatic logging
AuditLog.beforeCreate(async (log) => {
  if (log.action.startsWith('DB_')) {
    log.severity = 'INFO';
  }
});

AuditLog.beforeUpdate(async (log) => {
  if (log.status === 'FAILED') {
    log.severity = 'ERROR';
  }
});

module.exports = AuditLog;
