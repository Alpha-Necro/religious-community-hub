import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config();

// Create pool for postgres user to set up permissions
const pool = new Pool({
  user: 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  host: 'localhost',
  port: parseInt(process.env.DB_PRODUCTION_PORT || '5432'),
});

async function setupPermissions() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Connected to database successfully');
    
    // Read and execute the permissions SQL file
    const sql = await fs.readFile(
      path.join(process.cwd(), 'scripts', 'setupDatabasePermissions.sql'),
      'utf-8'
    );
    
    // Execute the permissions setup
    await client.query(sql);
    console.log('Database permissions set up successfully');
    
    client.release();
    await pool.end();
    
    console.log('Permissions setup completed successfully');
  } catch (error) {
    console.error('Error setting up permissions:', error);
    process.exit(1);
  }
}

setupPermissions();
