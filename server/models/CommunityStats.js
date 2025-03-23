const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CommunityStats extends sequelize.Sequelize.Model {}
  CommunityStats.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    totalMembers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    activeMembers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalEvents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    upcomingEvents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalResources: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    activeDiscussions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastUpdated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'CommunityStats',
    timestamps: true,
  });

  return CommunityStats;
};
