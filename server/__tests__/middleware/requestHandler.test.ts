import { Request, Response, NextFunction } from 'express';
import { requestHandler } from '../../src/middleware/requestHandler';
import { performanceMonitor } from '../../src/services/performanceMonitor';
import { monitoringService } from '../../src/services/monitoringService';
import { databaseHealthCheck } from '../../src/services/databaseHealthCheck';

jest.mock('../../src/services/performanceMonitor');
jest.mock('../../src/services/monitoringService');
jest.mock('../../src/services/databaseHealthCheck');

describe('Request Handler Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    req = {
      path: '/test',
      method: 'GET'
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle cached response', async () => {
    const cacheKey = `request:${req.method}:${req.path}`;
    const mockResponse = { data: 'cached' };
    
    (monitoringService.getCache as jest.Mock).mockResolvedValue(mockResponse);

    await requestHandler(req as Request, res as Response, next);

    expect(monitoringService.getCache).toHaveBeenCalledWith(cacheKey);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResponse);
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle database validation', async () => {
    (monitoringService.getCache as jest.Mock).mockResolvedValue(null);
    (databaseHealthCheck.validateConnection as jest.Mock).mockResolvedValue(undefined);

    await requestHandler(req as Request, res as Response, next);

    expect(databaseHealthCheck.validateConnection).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const mockError = new Error('Test error');
    (monitoringService.getCache as jest.Mock).mockRejectedValue(mockError);

    await requestHandler(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(mockError);
  });
});
