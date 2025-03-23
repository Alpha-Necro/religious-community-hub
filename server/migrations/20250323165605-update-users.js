'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'lastLogin', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'verificationToken', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'verificationTokenExpires', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'resetPasswordToken', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'resetPasswordExpires', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.removeColumn('Users', 'deletedAt');

    await queryInterface.addIndex('Users', ['email']);
    await queryInterface.addIndex('Users', ['role']);

    // Update existing users' passwords
    const users = await queryInterface.sequelize.query(
      'SELECT id, password FROM "Users"',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const user of users) {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        await queryInterface.sequelize.query(
          `UPDATE "Users" SET password = $password WHERE id = $id`,
          {
            bind: { password: hashedPassword, id: user.id },
            type: queryInterface.sequelize.QueryTypes.UPDATE
          }
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'lastLogin');
    await queryInterface.removeColumn('Users', 'verificationToken');
    await queryInterface.removeColumn('Users', 'verificationTokenExpires');
    await queryInterface.removeColumn('Users', 'resetPasswordToken');
    await queryInterface.removeColumn('Users', 'resetPasswordExpires');
    await queryInterface.removeIndex('Users', ['email']);
    await queryInterface.removeIndex('Users', ['role']);
  }
};
