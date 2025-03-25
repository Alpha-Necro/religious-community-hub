import { User } from '../models/User';
import { logger } from './logger';
import { crypto } from 'crypto';
import { config } from '../config';
import { performanceMonitor } from './performanceMonitor';

export interface MFASecret {
  secret: string;
  qrCode: string;
}

export interface MFACode {
  code: string;
  validUntil: Date;
}

export class MFAService {
  private static instance: MFAService;
  private readonly secretLength = 32;
  private readonly codeLength = 6;
  private readonly codeExpirationMinutes = 5;

  private constructor() {}

  public static getInstance(): MFAService {
    if (!MFAService.instance) {
      MFAService.instance = new MFAService();
    }
    return MFAService.instance;
  }

  public async generateSecret(user: User): Promise<MFASecret> {
    try {
      const secret = this.generateSecretKey();
      const issuer = config.api.baseUrl;
      const qrCode = this.generateQRCode(secret, user.email, issuer);

      // Log MFA secret generation
      logger.info('MFA secret generated', {
        userId: user.id,
        email: user.email,
      });

      return {
        secret,
        qrCode,
      };
    } catch (error) {
      logger.error('Error generating MFA secret', {
        error,
        userId: user.id,
      });
      throw error;
    }
  }

  private generateSecretKey(): string {
    return crypto.randomBytes(this.secretLength).toString('base32');
  }

  private generateQRCode(secret: string, email: string, issuer: string): string {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
      email,
    )}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
  }

  public async verifyCode(user: User, code: string): Promise<boolean> {
    try {
      const isValid = this.validateCode(user.mfaSecret, code);

      if (isValid) {
        // Log successful MFA verification
        logger.info('MFA verification successful', {
          userId: user.id,
          email: user.email,
        });
      } else {
        // Log failed MFA verification
        logger.warn('MFA verification failed', {
          userId: user.id,
          email: user.email,
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Error verifying MFA code', {
        error,
        userId: user.id,
      });
      throw error;
    }
  }

  private validateCode(secret: string, code: string): boolean {
    // Implement TOTP verification logic
    // This is a simplified version - in production, use a proper TOTP library
    const currentTime = Math.floor(Date.now() / 30000);
    const codes = this.generateCodes(secret, currentTime);
    return codes.includes(code);
  }

  private generateCodes(secret: string, time: number): string[] {
    // Generate codes for current and previous time steps
    const codes: string[] = [];
    for (let i = -1; i <= 1; i++) {
      codes.push(this.generateCode(secret, time + i));
    }
    return codes;
  }

  private generateCode(secret: string, time: number): string {
    // Simplified code generation - use a proper TOTP library in production
    const hash = crypto
      .createHmac('sha1', secret)
      .update(Buffer.from(time.toString(), 'hex'))
      .digest();

    const offset = hash[hash.length - 1] & 0xf;
    let truncatedHash =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    truncatedHash = truncatedHash % 1000000;
    return truncatedHash.toString().padStart(6, '0');
  }

  public async generateBackupCodes(user: User): Promise<string[]> {
    try {
      const codes = Array.from({ length: 10 }, () =>
        crypto.randomBytes(3).toString('hex').toUpperCase(),
      );

      // Log backup code generation
      logger.info('Backup codes generated', {
        userId: user.id,
        email: user.email,
        count: codes.length,
      });

      return codes;
    } catch (error) {
      logger.error('Error generating backup codes', {
        error,
        userId: user.id,
      });
      throw error;
    }
  }

  public async verifyBackupCode(user: User, code: string): Promise<boolean> {
    try {
      const isValid = user.backupCodes?.includes(code) ?? false;

      if (isValid) {
        // Remove used backup code
        user.backupCodes = user.backupCodes?.filter((c) => c !== code);
        await user.save();

        // Log successful backup code verification
        logger.info('Backup code verification successful', {
          userId: user.id,
          email: user.email,
        });
      } else {
        // Log failed backup code verification
        logger.warn('Backup code verification failed', {
          userId: user.id,
          email: user.email,
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Error verifying backup code', {
        error,
        userId: user.id,
      });
      throw error;
    }
  }

  public async recoverMFA(user: User): Promise<void> {
    try {
      // Reset MFA settings
      user.mfaSecret = null;
      user.backupCodes = null;
      await user.save();

      // Log MFA recovery
      logger.info('MFA recovery initiated', {
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      logger.error('Error during MFA recovery', {
        error,
        userId: user.id,
      });
      throw error;
    }
  }

  public async enableMFA(user: User, secret: string): Promise<void> {
    try {
      user.mfaSecret = secret;
      user.backupCodes = await this.generateBackupCodes(user);
      await user.save();

      // Log MFA enable
      logger.info('MFA enabled', {
        userId: user.id,
        email: user.email,
      });

      // Create performance alert
      performanceMonitor.createAlert({
        title: 'MFA Enabled',
        description: `MFA has been enabled for user ${user.id}`,
        severity: 'INFO',
        type: 'SECURITY_ALERT',
        metadata: {
          userId: user.id,
          email: user.email,
        },
      });
    } catch (error) {
      logger.error('Error enabling MFA', {
        error,
        userId: user.id,
      });
      throw error;
    }
  }

  public async disableMFA(user: User): Promise<void> {
    try {
      user.mfaSecret = null;
      user.backupCodes = null;
      await user.save();

      // Log MFA disable
      logger.info('MFA disabled', {
        userId: user.id,
        email: user.email,
      });

      // Create performance alert
      performanceMonitor.createAlert({
        title: 'MFA Disabled',
        description: `MFA has been disabled for user ${user.id}`,
        severity: 'WARNING',
        type: 'SECURITY_ALERT',
        metadata: {
          userId: user.id,
          email: user.email,
        },
      });
    } catch (error) {
      logger.error('Error disabling MFA', {
        error,
        userId: user.id,
      });
      throw error;
    }
  }
}

export const mfaService = MFAService.getInstance();
