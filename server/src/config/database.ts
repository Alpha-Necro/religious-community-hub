import { Sequelize } from 'sequelize';
import { getEnvironment } from './environment';

const env = getEnvironment();

const sequelize = new Sequelize({
  dialect: env.DB_DIALECT || 'postgres',
  host: env.DB_HOST || 'localhost',
  port: env.DB_PORT ? parseInt(env.DB_PORT) : 5432,
  username: env.DB_USER || 'postgres',
  password: env.DB_PASSWORD || 'postgres',
  database: env.DB_NAME || 'religious_community_hub',
  logging: env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true
  }
});

// Initialize database health check
import { databaseHealthCheck } from '../services/databaseHealthCheck';

databaseHealthCheck.startHealthCheck();

export default sequelize;
