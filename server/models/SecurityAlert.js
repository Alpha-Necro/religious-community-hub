const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SecurityAlert = sequelize.define('SecurityAlert', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  severity: {
    type: DataTypes.ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL'),
    allowNull: false,
    defaultValue: 'INFO',
  },
  type: {
    type: DataTypes.ENUM(
      'LOGIN_ATTEMPT',
      'ACCOUNT_LOCKOUT',
      'PASSWORD_CHANGE',
      'FAILED_LOGIN',
      'SECURITY_VIOLATION',
      'SYSTEM_ERROR',
      'BACKUP_FAILURE',
      'AUDIT_LOG',
      'CONFIG_CHANGE'
    ),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('NEW', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED'),
    allowNull: false,
    defaultValue: 'NEW',
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  acknowledgedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  acknowledgedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  resolvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['severity'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['createdAt'] },
    { fields: ['userId'] },
    { fields: ['acknowledgedAt'] },
    { fields: ['resolvedAt'] },
  ]
});

// Add hooks for automatic status updates
SecurityAlert.beforeUpdate(async (alert) => {
  if (alert.status === 'ACKNOWLEDGED' && !alert.acknowledgedAt) {
    alert.acknowledgedAt = new Date();
  }
  
  if (alert.status === 'RESOLVED' && !alert.resolvedAt) {
    alert.resolvedAt = new Date();
  }
});

module.exports = SecurityAlert;
