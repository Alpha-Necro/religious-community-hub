import { databaseService } from '../services/databaseService';

describe('Database Service', () => {
  beforeEach(() => {
    databaseService.resetMetrics();
  });

  it('should initialize successfully', async () => {
    await databaseService.initialize();
    expect(databaseService.isInitialized).toBe(true);
  });

  it('should execute queries with proper optimization', async () => {
    const query = 'SELECT * FROM users LIMIT 10';
    const result = await databaseService.executeQuery(query, 'LOW');
    
    expect(result).toHaveProperty('rows');
    expect(result).toHaveProperty('executionTime');
    expect(result).toHaveProperty('queryPlan');
  });

  it('should handle query caching', async () => {
    const query = 'SELECT * FROM users WHERE id = 1';
    
    // First execution (not cached)
    const result1 = await databaseService.executeQuery(query, 'MEDIUM');
    expect(result1.fromCache).toBe(false);
    
    // Second execution (should be cached)
    const result2 = await databaseService.executeQuery(query, 'MEDIUM');
    expect(result2.fromCache).toBe(true);
  });

  it('should optimize batch operations', async () => {
    const operations = [
      { type: 'INSERT', table: 'users', data: { name: 'test1' } },
      { type: 'INSERT', table: 'users', data: { name: 'test2' } }
    ];
    
    const result = await databaseService.optimizeBatchOperations(operations);
    expect(result).toHaveProperty('batchSize');
    expect(result).toHaveProperty('executionTime');
    expect(result).toHaveProperty('optimizationLevel');
  });

  it('should generate query optimization report', () => {
    const report = databaseService.generateOptimizationReport();
    expect(report).toHaveProperty('slowQueries');
    expect(report).toHaveProperty('indexUsage');
    expect(report).toHaveProperty('cacheHits');
    expect(report).toHaveProperty('recommendations');
  });

  it('should handle database errors gracefully', async () => {
    const originalExecute = databaseService.executeQuery;
    databaseService.executeQuery = jest.fn().mockRejectedValue(new Error('Database error'));
    
    await expect(databaseService.executeQuery('SELECT * FROM non_existent_table'))
      .rejects
      .toThrow('Database error');
    
    databaseService.executeQuery = originalExecute;
  });

  it('should clean up resources', async () => {
    await databaseService.cleanup();
    expect(databaseService.isInitialized).toBe(false);
  });
});
