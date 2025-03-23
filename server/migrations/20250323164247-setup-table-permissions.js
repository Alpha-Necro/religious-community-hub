'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */

    // Create role if it doesn't exist
    await queryInterface.sequelize.query(
      `DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_role') THEN
          CREATE ROLE app_role;
        END IF;
      END $$;`
    );

    // Grant permissions to role
    await queryInterface.sequelize.query(
      `GRANT CONNECT ON DATABASE ${queryInterface.sequelize.config.database} TO app_role;
      GRANT USAGE ON SCHEMA public TO app_role;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_role;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_role;`
    );

    // Create user if it doesn't exist
    await queryInterface.sequelize.query(
      `DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user_secure') THEN
          CREATE USER app_user_secure PASSWORD 'app_user_secure_password';
        END IF;
      END $$;`
    );

    // Grant role to user
    await queryInterface.sequelize.query(
      'GRANT app_role TO app_user_secure;'
    );

    // Set default privileges for future tables
    await queryInterface.sequelize.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO app_role;`
    );
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */

    // Revoke privileges and drop user and role
    await queryInterface.sequelize.query(
      `REVOKE ALL PRIVILEGES ON DATABASE ${queryInterface.sequelize.config.database} FROM app_role;
      REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_role;
      REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM app_role;
      DROP ROLE IF EXISTS app_role;
      DROP USER IF EXISTS app_user_secure;`
    );
  }
};
