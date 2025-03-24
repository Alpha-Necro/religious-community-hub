import { requestHandler } from '../middleware/requestHandler';
import { performanceMonitor } from '../services/performanceMonitor';
import { cachingService } from '../services/cachingService';
import { databaseService } from '../services/databaseService';

describe('Request Handler', () => {
  const mockRequest = {
    method: 'GET',
    url: '/api/test',
    headers: {},
    body: {},
    params: {},
    query: {}
  };

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
    end: jest.fn()
  };

  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    performanceMonitor.resetMetrics();
    cachingService.clear('test');
    databaseService.resetMetrics();
  });

  it('should handle request compression', async () => {
    const compressedRequest = {
      ...mockRequest,
      headers: { 'content-encoding': 'gzip' }
    };
    
    await requestHandler.handleRequest(compressedRequest, mockResponse, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(performanceMonitor.metrics.compression).toBeGreaterThan(0);
  });

  it('should handle request caching', async () => {
    const cachedRequest = {
      ...mockRequest,
      headers: { 'cache-control': 'public' }
    };
    
    await requestHandler.handleRequest(cachedRequest, mockResponse, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(cachingService.getMetrics().hits).toBeGreaterThan(0);
  });

  it('should handle rate limiting', async () => {
    const rateLimitedRequest = {
      ...mockRequest,
      ip: '127.0.0.1'
    };
    
    // First request should pass
    await requestHandler.handleRequest(rateLimitedRequest, mockResponse, mockNext);
    expect(mockNext).toHaveBeenCalled();
    
    // Mock rate limit exceeded
    const originalCheck = requestHandler.rateLimiter.check;
    requestHandler.rateLimiter.check = jest.fn().mockRejectedValue(new Error('Rate limit exceeded'));
    
    // Second request should be rate limited
    await requestHandler.handleRequest(rateLimitedRequest, mockResponse, mockNext);
    expect(mockResponse.status).toHaveBeenCalledWith(429);
    
    // Restore original method
    requestHandler.rateLimiter.check = originalCheck;
  });

  it('should handle request validation', async () => {
    const invalidRequest = {
      ...mockRequest,
      body: { invalid: 'data' }
    };
    
    const schema = {
      body: {
        required: true,
        type: 'object',
        properties: {
          valid: { type: 'string' }
        }
      }
    };
    
    await requestHandler.validateRequest(invalidRequest, schema);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });

  it('should track request metrics', async () => {
    await requestHandler.handleRequest(mockRequest, mockResponse, mockNext);
    
    const metrics = requestHandler.getMetrics();
    expect(metrics).toHaveProperty('totalRequests');
    expect(metrics).toHaveProperty('responseTimes');
    expect(metrics).toHaveProperty('statusCodes');
  });

  it('should handle request errors', async () => {
    const errorRequest = {
      ...mockRequest,
      url: '/api/error'
    };
    
    const originalNext = mockNext;
    mockNext.mockImplementation(() => {
      throw new Error('Request error');
    });
    
    await requestHandler.handleRequest(errorRequest, mockResponse, mockNext);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    
    // Restore original next function
    mockNext.mockImplementation(originalNext);
  });
});
