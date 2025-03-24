require('dotenv').config();

const { Sequelize } = require('sequelize');
const config = require('./config');
const { trackDatabaseOperations } = require('../utils/databaseInterceptor');
const fs = require('fs');

const env = process.env.NODE_ENV || 'development';
const dbConfig = {
  database: process.env.DB_NAME || 'religious_community_hub',
  username: process.env.DB_USER || 'nabilbelkas',
  password: process.env.DB_PASSWORD || 'your_password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    paranoid: true,
    underscored: true,
  },
  ssl: {
    enabled: env === 'production',
    rejectUnauthorized: true,
    ca: process.env.DB_SSL_CA ? fs.readFileSync(process.env.DB_SSL_CA) : undefined,
    cert: process.env.DB_SSL_CERT ? fs.readFileSync(process.env.DB_SSL_CERT) : undefined,
    key: process.env.DB_SSL_KEY ? fs.readFileSync(process.env.DB_SSL_KEY) : undefined
  },
  connectionTimeout: 10000,
  idleTimeout: 30000,
  maxLifetime: 3600000,
};

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: dbConfig.define,
    dialectOptions: dbConfig.ssl,
    connectionTimeout: dbConfig.connectionTimeout,
    idleTimeout: dbConfig.idleTimeout,
    maxLifetime: dbConfig.maxLifetime,
  }
);

// Track database operations
trackDatabaseOperations(sequelize);

// Test the connection
sequelize.authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

module.exports = sequelize;
