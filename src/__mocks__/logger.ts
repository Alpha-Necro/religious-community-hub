export class LoggerMock {
  public info(message: string, meta?: any): void {
    console.log(`[INFO] ${message}`, meta);
  }

  public warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${message}`, meta);
  }

  public error(message: string, meta?: any): void {
    console.error(`[ERROR] ${message}`, meta);
  }

  public debug(message: string, meta?: any): void {
    console.debug(`[DEBUG] ${message}`, meta);
  }
}

export const loggerMock = new LoggerMock();

// Jest mock implementation
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: loggerMock,
}));
