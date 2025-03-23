const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const PrayerTimes = sequelize.define('PrayerTimes', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fajr: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dhuhr: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    asr: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    maghrib: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isha: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    method: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2, // Umm Al-Qura University, Makkah
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'PrayerTimes',
    timestamps: true,
  });

  return PrayerTimes;
};
