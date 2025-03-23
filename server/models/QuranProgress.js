const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class QuranProgress extends sequelize.Sequelize.Model {}
  QuranProgress.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    progress: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    lastReadDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    targetDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    currentSurah: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    currentAyah: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    readingMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'daily',
    },
    readingGoal: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'QuranProgress',
    timestamps: true,
  });

  return QuranProgress;
};
