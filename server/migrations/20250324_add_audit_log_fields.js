const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addColumn('audit_logs', 'severity', {
      type: DataTypes.ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL'),
      allowNull: false,
      defaultValue: 'INFO',
    });

    await queryInterface.addColumn('audit_logs', 'category', {
      type: DataTypes.ENUM(
        'GENERAL',
        'SECURITY',
        'AUTHENTICATION',
        'ACCESS',
        'SYSTEM',
        'AUDIT'
      ),
      allowNull: false,
      defaultValue: 'GENERAL',
    });

    await queryInterface.addColumn('audit_logs', 'correlationId', {
      type: DataTypes.UUID,
      allowNull: true,
    });

    await queryInterface.addColumn('audit_logs', 'requestMethod', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('audit_logs', 'requestUrl', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('audit_logs', 'responseCode', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('audit_logs', 'responseMessage', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    // Add indexes
    await queryInterface.addIndex('audit_logs', ['severity']);
    await queryInterface.addIndex('audit_logs', ['category']);
    await queryInterface.addIndex('audit_logs', ['correlationId']);
    await queryInterface.addIndex('audit_logs', ['requestMethod']);
    await queryInterface.addIndex('audit_logs', ['requestUrl']);
    await queryInterface.addIndex('audit_logs', ['responseCode']);
  },

  down: async (queryInterface) => {
    // Remove indexes
    await queryInterface.removeIndex('audit_logs', ['severity']);
    await queryInterface.removeIndex('audit_logs', ['category']);
    await queryInterface.removeIndex('audit_logs', ['correlationId']);
    await queryInterface.removeIndex('audit_logs', ['requestMethod']);
    await queryInterface.removeIndex('audit_logs', ['requestUrl']);
    await queryInterface.removeIndex('audit_logs', ['responseCode']);

    // Remove columns
    await queryInterface.removeColumn('audit_logs', 'severity');
    await queryInterface.removeColumn('audit_logs', 'category');
    await queryInterface.removeColumn('audit_logs', 'correlationId');
    await queryInterface.removeColumn('audit_logs', 'requestMethod');
    await queryInterface.removeColumn('audit_logs', 'requestUrl');
    await queryInterface.removeColumn('audit_logs', 'responseCode');
    await queryInterface.removeColumn('audit_logs', 'responseMessage');
  },
};
