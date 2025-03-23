'use strict';

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/config');
const { DataTypes } = require('sequelize');

const basename = path.basename(__filename);
const modelDefiners = [];

// Read all files in the models directory
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file));
    modelDefiners.push(model);
  });

// Define associations
modelDefiners.forEach((model) => {
  if (model.associate) {
    model.associate(sequelize.models);
  }
});

// Initialize models
modelDefiners.forEach((model) => {
  const Model = model(sequelize, DataTypes);
  sequelize.models[Model.name] = Model;
});

module.exports = {
  ...sequelize.models,
  sequelize,
  DataTypes,
};
