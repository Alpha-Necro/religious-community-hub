import { Pool } from 'pg';

const testConfig = {
  user: process.env.DB_TEST_USER,
  password: process.env.DB_TEST_PASSWORD,
  host: process.env.DB_TEST_HOST,
  database: process.env.DB_TEST_NAME,
  port: 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const testPool = new Pool(testConfig);

// Initialize test database
export async function initializeTestDatabase(): Promise<void> {
  try {
    await testPool.query(`
      CREATE DATABASE IF NOT EXISTS ${process.env.DB_TEST_NAME};
      USE ${process.env.DB_TEST_NAME};
    `);
    
    // Create test user if it doesn't exist
    await testPool.query(`
      CREATE USER IF NOT EXISTS ${process.env.DB_TEST_USER} WITH PASSWORD '${process.env.DB_TEST_PASSWORD}';
      GRANT ALL PRIVILEGES ON DATABASE ${process.env.DB_TEST_NAME} TO ${process.env.DB_TEST_USER};
    `);
    
    console.log('Test database initialized successfully');
  } catch (error) {
    console.error('Error initializing test database:', error);
    throw error;
  }
}

// Cleanup test database
export async function cleanupTestDatabase(): Promise<void> {
  try {
    await testPool.query(`
      DROP DATABASE IF EXISTS ${process.env.DB_TEST_NAME};
    `);
    console.log('Test database cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up test database:', error);
    throw error;
  }
}

export default testPool;
