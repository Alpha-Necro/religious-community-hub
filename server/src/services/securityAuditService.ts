import { performanceMonitor } from './performanceMonitor';
import { securityAlertService } from './securityAlertService';
import { User } from '../models/User';

export interface SecurityAuditEntry {
  timestamp: string;
  userId?: string;
  username?: string;
  action: string;
  category: 'authentication' | 'authorization' | 'data_access' | 'system' | 'network';
  details: {
    [key: string]: any;
  };
  severity: 'info' | 'warning' | 'error' | 'critical';
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
}

export class SecurityAuditService {
  private static instance: SecurityAuditService;
  private auditLog: SecurityAuditEntry[] = [];

  private constructor() {}

  public static getInstance(): SecurityAuditService {
    if (!SecurityAuditService.instance) {
      SecurityAuditService.instance = new SecurityAuditService();
    }
    return SecurityAuditService.instance;
  }

  public async logAuthenticationEvent(
    user: User | null,
    action: 'login' | 'logout' | 'failed_login',
    success: boolean,
    details: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const entry: SecurityAuditEntry = {
      timestamp: new Date().toISOString(),
      userId: user?.id,
      username: user?.username,
      action: `auth_${action}`,
      category: 'authentication',
      details: {
        ...details,
        method: action === 'failed_login' ? 'failed_login' : 'successful_login'
      },
      severity: action === 'failed_login' ? 'warning' : 'info',
      ipAddress,
      userAgent,
      success
    };

    await this.logEntry(entry);
  }

  public async logAuthorizationEvent(
    user: User | null,
    action: string,
    resource: string,
    success: boolean,
    details: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const entry: SecurityAuditEntry = {
      timestamp: new Date().toISOString(),
      userId: user?.id,
      username: user?.username,
      action: `authz_${action}`,
      category: 'authorization',
      details: {
        ...details,
        resource,
        permission: action
      },
      severity: success ? 'info' : 'warning',
      ipAddress,
      userAgent,
      success
    };

    await this.logEntry(entry);
  }

  public async logDataAccessEvent(
    user: User | null,
    action: 'read' | 'write' | 'delete',
    resource: string,
    success: boolean,
    details: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const entry: SecurityAuditEntry = {
      timestamp: new Date().toISOString(),
      userId: user?.id,
      username: user?.username,
      action: `data_${action}`,
      category: 'data_access',
      details: {
        ...details,
        resource,
        operation: action
      },
      severity: success ? 'info' : 'error',
      ipAddress,
      userAgent,
      success
    };

    await this.logEntry(entry);
  }

  public async logSystemEvent(
    action: string,
    details: Record<string, any>,
    severity: 'info' | 'warning' | 'error' | 'critical',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const entry: SecurityAuditEntry = {
      timestamp: new Date().toISOString(),
      action: `sys_${action}`,
      category: 'system',
      details,
      severity,
      ipAddress,
      userAgent,
      success: severity === 'info' || severity === 'warning'
    };

    await this.logEntry(entry);
  }

  public async logNetworkEvent(
    action: string,
    details: Record<string, any>,
    severity: 'info' | 'warning' | 'error' | 'critical',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const entry: SecurityAuditEntry = {
      timestamp: new Date().toISOString(),
      action: `net_${action}`,
      category: 'network',
      details,
      severity,
      ipAddress,
      userAgent,
      success: severity === 'info' || severity === 'warning'
    };

    await this.logEntry(entry);
  }

  private async logEntry(entry: SecurityAuditEntry): Promise<void> {
    try {
      this.auditLog.push(entry);
      
      // Log to performance monitor for metrics
      performanceMonitor.updateMetrics({
        security: {
          category: entry.category,
          action: entry.action,
          severity: entry.severity,
          success: entry.success
        }
      });

      // Send alert for critical events
      if (entry.severity === 'critical') {
        await securityAlertService.sendAlert(
          'Critical Security Event',
          JSON.stringify(entry)
        );
      } else if (entry.severity === 'error') {
        await securityAlertService.sendAlert(
          'Security Error',
          JSON.stringify(entry)
        );
      }
    } catch (error) {
      console.error('Failed to log security audit entry:', error);
    }
  }

  public async getAuditLog(
    category?: string,
    severity?: string,
    startDate?: string,
    endDate?: string
  ): Promise<SecurityAuditEntry[]> {
    const filteredLog = this.auditLog.filter(entry => {
      if (category && entry.category !== category) return false;
      if (severity && entry.severity !== severity) return false;
      if (startDate && new Date(entry.timestamp) < new Date(startDate)) return false;
      if (endDate && new Date(entry.timestamp) > new Date(endDate)) return false;
      return true;
    });

    return filteredLog;
  }
}

export const securityAuditService = SecurityAuditService.getInstance();
