import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

const isTest = process.env.NODE_ENV === 'test';
const isDev = process.env.NODE_ENV === 'development';

// Database configuration
const dbConfig = {
  user: isTest ? process.env.DB_TEST_USER : isDev ? process.env.DB_DEV_USER : process.env.DB_PRODUCTION_USER,
  password: isTest ? process.env.DB_TEST_PASSWORD : isDev ? process.env.DB_DEV_PASSWORD : process.env.DB_PRODUCTION_PASSWORD,
  host: isTest ? process.env.DB_TEST_HOST : isDev ? process.env.DB_HOST : process.env.DB_PRODUCTION_HOST,
  database: isTest ? process.env.DB_TEST_NAME : isDev ? process.env.DB_NAME : process.env.DB_PRODUCTION_NAME,
  port: parseInt(process.env.DB_PRODUCTION_PORT || '5432'),
};

// Create database pool
const pool = new Pool(dbConfig);

// Base schema
const baseSchema = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prayer_times (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  fajr TIME NOT NULL,
  dhuhr TIME NOT NULL,
  asr TIME NOT NULL,
  maghrib TIME NOT NULL,
  isha TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(255),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_times_date ON prayer_times(date);
CREATE INDEX IF NOT EXISTS idx_community_events_start_time ON community_events(start_time);
`;

async function initializeDatabase() {
  try {
    // Connect to database
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Connected to database successfully');
    
    // Create schema
    await client.query(baseSchema);
    console.log('Base schema created successfully');
    
    // Load and execute all migration files
    const migrationsDir = path.join(process.cwd(), 'migrations');
    
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      for (const file of migrationFiles) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await client.query(sql);
        console.log(`Migration ${file} completed successfully`);
      }
    }
    
    client.release();
    await pool.end();
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
