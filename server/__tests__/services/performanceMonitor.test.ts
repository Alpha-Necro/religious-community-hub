import { performanceMonitor } from '../services/performanceMonitor';

describe('Performance Monitor', () => {
  beforeEach(() => {
    performanceMonitor.resetMetrics();
  });

  it('should initialize successfully', async () => {
    await performanceMonitor.initialize();
    expect(performanceMonitor.isInitialized).toBe(true);
  });

  it('should collect memory metrics', () => {
    const metrics = performanceMonitor.collectMemoryMetrics();
    expect(metrics).toHaveProperty('heapTotal');
    expect(metrics).toHaveProperty('heapUsed');
    expect(metrics).toHaveProperty('rss');
  });

  it('should collect CPU metrics', () => {
    const metrics = performanceMonitor.collectCPUMetrics();
    expect(metrics).toHaveProperty('loadAverage');
    expect(metrics).toHaveProperty('cpuUsage');
  });

  it('should collect network metrics', () => {
    const metrics = performanceMonitor.collectNetworkMetrics();
    expect(metrics).toHaveProperty('sent');
    expect(metrics).toHaveProperty('received');
  });

  it('should detect high memory usage', () => {
    performanceMonitor.memoryUsage = 0.95;
    const alert = performanceMonitor.checkMemoryThreshold();
    expect(alert).toBe(true);
  });

  it('should detect high CPU usage', () => {
    performanceMonitor.cpuUsage = 0.9;
    const alert = performanceMonitor.checkCPUThreshold();
    expect(alert).toBe(true);
  });

  it('should generate performance report', () => {
    const report = performanceMonitor.generateReport();
    expect(report).toHaveProperty('memory');
    expect(report).toHaveProperty('cpu');
    expect(report).toHaveProperty('network');
    expect(report).toHaveProperty('recommendations');
  });

  it('should clean up resources', async () => {
    await performanceMonitor.cleanup();
    expect(performanceMonitor.isInitialized).toBe(false);
  });
});
