import sequelize from '../src/config/database';
import { getEnvironment } from '../src/config/environment';

async function validateDatabaseConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection successful');
    
    // Check if the database exists
    await sequelize.query('SELECT 1');
    console.log('Database exists and is accessible');
    
    // Check if essential tables exist (add your table names here)
    const essentialTables = ['users', 'prayers', 'events']; // Add your actual table names
    const [tables] = await sequelize.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $schema',
      {
        bind: { schema: 'public' }
      }
    );

    const missingTables = essentialTables.filter(table => 
      !tables.find(t => t.table_name === table)
    );

    if (missingTables.length > 0) {
      console.warn('Warning: Missing essential tables:', missingTables);
    } else {
      console.log('All essential tables are present');
    }

    // Check database performance
    const startTime = Date.now();
    await sequelize.query('SELECT 1');
    const responseTime = Date.now() - startTime;

    console.log(`Database response time: ${responseTime}ms`);
    
    if (responseTime > 1000) {
      console.warn('Warning: High database response time (>1000ms)');
    }

    // Check connection pool status
    const poolStatus = await sequelize.pool.status();
    console.log('Connection pool status:', poolStatus);

    return true;
  } catch (error) {
    console.error('Database connection validation failed:', error);
    return false;
  }
}

async function main() {
  const environment = getEnvironment();
  console.log(`Validating database connection for environment: ${environment}`);
  
  const isValid = await validateDatabaseConnection();
  
  if (!isValid) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error in database validation script:', error);
  process.exit(1);
});
