export class RedisServiceMock {
  private store: Map<string, { value: string; expiry: number }> = new Map();

  public async set(key: string, value: string, expiry?: number): Promise<boolean> {
    const entry = {
      value,
      expiry: expiry ? Date.now() + expiry * 1000 : Infinity,
    };
    this.store.set(key, entry);
    return true;
  }

  public async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (entry.expiry < Date.now()) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }

  public async del(key: string): Promise<boolean> {
    this.store.delete(key);
    return true;
  }

  public async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    
    return entry.expiry >= Date.now();
  }

  public async flushDb(): Promise<boolean> {
    this.store.clear();
    return true;
  }

  public async disconnect(): Promise<void> {
    this.store.clear();
  }

  public isReady(): boolean {
    return true;
  }
}

export const redisServiceMock = new RedisServiceMock();

// Jest mock implementation
jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: redisServiceMock,
}));
