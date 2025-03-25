const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addColumn('users', 'mfaSecret', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'backupCodes', {
      type: DataTypes.JSONB,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'mfaEnabled', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('users', 'mfaLastEnabledAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'mfaLastVerificationAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });

    // Add indexes
    await queryInterface.addIndex('users', ['mfaEnabled']);
    await queryInterface.addIndex('users', ['mfaLastEnabledAt']);
  },

  down: async (queryInterface) => {
    // Remove indexes
    await queryInterface.removeIndex('users', ['mfaEnabled']);
    await queryInterface.removeIndex('users', ['mfaLastEnabledAt']);

    // Remove columns
    await queryInterface.removeColumn('users', 'mfaSecret');
    await queryInterface.removeColumn('users', 'backupCodes');
    await queryInterface.removeColumn('users', 'mfaEnabled');
    await queryInterface.removeColumn('users', 'mfaLastEnabledAt');
    await queryInterface.removeColumn('users', 'mfaLastVerificationAt');
  },
};
