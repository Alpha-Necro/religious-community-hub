import { Request } from 'express';

export class IPAccessControlService {
  private static readonly WHITELIST: string[] = [
    '127.0.0.1', // localhost
    '::1' // IPv6 localhost
  ];

  public static isAllowed(ip: string): boolean {
    return this.WHITELIST.includes(ip);
  }

  public static getIPFromRequest(req: Request): string {
    return req.ip || req.connection.remoteAddress || '';
  }
}

export const ipAccessControlService = new IPAccessControlService();
