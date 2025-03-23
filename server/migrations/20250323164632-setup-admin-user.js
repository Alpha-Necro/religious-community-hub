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

    // Create admin role if it doesn't exist
    await queryInterface.sequelize.query(
      `DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
          CREATE ROLE admin_role;
        END IF;
      END $$;`
    );

    // Grant admin privileges
    await queryInterface.sequelize.query(
      `GRANT ALL PRIVILEGES ON DATABASE ${queryInterface.sequelize.config.database} TO admin_role;
      GRANT ALL PRIVILEGES ON SCHEMA public TO admin_role;
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_role;
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin_role;`
    );

    // Create godmode user if it doesn't exist
    await queryInterface.sequelize.query(
      `DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'godmode') THEN
          CREATE USER godmode WITH PASSWORD 'SQL.Nabil@8491.' SUPERUSER;
        END IF;
      END $$;`
    );

    // Grant admin role to godmode
    await queryInterface.sequelize.query(
      'GRANT admin_role TO godmode;'
    );

    // Set default privileges for future tables
    await queryInterface.sequelize.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT ALL PRIVILEGES ON TABLES TO admin_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT ALL PRIVILEGES ON SEQUENCES TO admin_role;`
    );

    // Create admin user in the Users table
    const hashedPassword = await queryInterface.sequelize.query(
      `SELECT crypt('SQL.Nabil@8491.', gen_salt('bf')) as password;`
    );

    await queryInterface.bulkInsert('Users', [
      {
        name: 'System Administrator',
        email: 'admin@relcomhub.com',
        password: hashedPassword[0][0].password,
        role: 'admin',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */

    // Remove admin user and role
    await queryInterface.sequelize.query(
      `REVOKE ALL PRIVILEGES ON DATABASE ${queryInterface.sequelize.config.database} FROM admin_role;
      REVOKE ALL PRIVILEGES ON SCHEMA public FROM admin_role;
      REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM admin_role;
      REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM admin_role;
      DROP ROLE IF EXISTS admin_role;
      DROP USER IF EXISTS godmode;`
    );

    // Remove admin user from Users table
    await queryInterface.bulkDelete('Users', {
      email: 'admin@relcomhub.com'
    }, {});
  }
};
