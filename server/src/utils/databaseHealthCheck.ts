import { Pool } from 'pg';
import { Logger } from './logger';

const logger = new Logger('DatabaseHealthCheck');

export class DatabaseHealthCheck {
  private static instance: DatabaseHealthCheck;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'appuser',
      password: process.env.DB_PASSWORD || 'your-password',
      database: process.env.DB_NAME || 'religious_community_hub',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
    });
  }

  public static getInstance(): DatabaseHealthCheck {
    if (!DatabaseHealthCheck.instance) {
      DatabaseHealthCheck.instance = new DatabaseHealthCheck();
    }
    return DatabaseHealthCheck.instance;
  }

  public async checkConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      logger.info('Database connection successful');
      return true;
    } catch (error) {
      logger.error('Database connection failed', { error });
      return false;
    }
  }

  public async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const query = `
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `;
      const { rows } = await this.pool.query(query, [tableName]);
      return rows[0].exists;
    } catch (error) {
      logger.error(`Failed to check if table ${tableName} exists`, { error });
      return false;
    }
  }

  public async getTableCount(tableName: string): Promise<number> {
    try {
      const query = `SELECT COUNT(*) FROM ${tableName}`;
      const { rows } = await this.pool.query(query);
      return rows[0].count;
    } catch (error) {
      logger.error(`Failed to get row count for table ${tableName}`, { error });
      return 0;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}
