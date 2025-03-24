const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { auditLogService } = require('../services/auditLogService');
const { ApiError } = require('../middleware/errorHandler');

const backupConfig = {
  backupDir: process.env.DB_BACKUP_DIR || path.join(__dirname, '../../backups'),
  maxBackups: parseInt(process.env.DB_MAX_BACKUPS) || 7,
  compress: process.env.DB_BACKUP_COMPRESS !== 'false',
  encrypt: process.env.DB_BACKUP_ENCRYPT !== 'false',
  encryptionKey: process.env.DB_BACKUP_ENCRYPTION_KEY,
  retentionDays: parseInt(process.env.DB_BACKUP_RETENTION_DAYS) || 30,
  verifyBackup: process.env.DB_BACKUP_VERIFY !== 'false',
};

// Ensure backup directory exists
if (!fs.existsSync(backupConfig.backupDir)) {
  fs.mkdirSync(backupConfig.backupDir, { recursive: true });
}

const databaseBackupService = {
  async createBackup(options = {}) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(
        backupConfig.backupDir,
        `backup-${timestamp}.sql${backupConfig.compress ? '.gz' : ''}${backupConfig.encrypt ? '.enc' : ''}`
      );

      const dbConfig = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      };

      // Build backup command
      let command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} ${dbConfig.database}`;

      // Add compression if enabled
      if (backupConfig.compress) {
        command += ' | gzip';
      }

      // Add encryption if enabled
      if (backupConfig.encrypt && backupConfig.encryptionKey) {
        command += ` | openssl enc -aes-256-cbc -k "${backupConfig.encryptionKey}"`;
      }

      // Add output redirection
      command += ` > ${backupFile}`;

      const startTime = Date.now();
      
      return new Promise((resolve, reject) => {
        exec(command, { env: { PGPASSWORD: dbConfig.password } }, async (error, stdout, stderr) => {
          const duration = Date.now() - startTime;
          
          if (error) {
            // Log backup failure
            await auditLogService.logAction({
              action: 'DB_BACKUP_FAILED',
              entity: 'Database',
              description: `Backup failed: ${stderr}`,
              severity: 'ERROR',
              status: 'FAILED',
              duration,
            });
            
            reject(new ApiError(500, 'Failed to create database backup', [stderr]));
            return;
          }

          // Verify backup if enabled
          if (backupConfig.verifyBackup) {
            try {
              await databaseBackupService.verifyBackup(backupFile);
            } catch (verifyError) {
              await auditLogService.logAction({
                action: 'DB_BACKUP_VERIFY_FAILED',
                entity: 'Database',
                description: `Backup verification failed: ${verifyError.message}`,
                severity: 'ERROR',
                status: 'FAILED',
                duration,
              });
              
              reject(new ApiError(500, 'Failed to verify database backup', [verifyError.message]));
              return;
            }
          }

          // Clean up old backups
          await databaseBackupService.cleanupOldBackups();

          // Log backup success
          await auditLogService.logAction({
            action: 'DB_BACKUP_SUCCESS',
            entity: 'Database',
            description: 'Database backup completed successfully',
            severity: 'INFO',
            status: 'SUCCESS',
            duration,
            metadata: {
              backupFile,
              size: fs.statSync(backupFile).size,
              options,
            },
          });

          resolve({
            backupFile,
            timestamp,
            size: fs.statSync(backupFile).size,
            duration,
          });
        });
      });
    } catch (error) {
      throw new ApiError(500, 'Failed to create database backup', [error.message]);
    }
  },

  async verifyBackup(backupFile) {
    try {
      const tempDir = path.join(backupConfig.backupDir, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      const tempFile = path.join(tempDir, 'verify.sql');
      
      // Build restore command
      let command = backupConfig.encrypt 
        ? `openssl enc -d -aes-256-cbc -k "${backupConfig.encryptionKey}" < ${backupFile}`
        : `cat ${backupFile}`;

      if (backupConfig.compress) {
        command += ' | gunzip';
      }

      command += ` > ${tempFile}`;

      return new Promise((resolve, reject) => {
        exec(command, { env: { PGPASSWORD: process.env.DB_PASSWORD } }, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Backup verification failed: ${stderr}`));
            return;
          }

          // Clean up temporary files
          fs.unlinkSync(tempFile);
          resolve(true);
        });
      });
    } catch (error) {
      throw new ApiError(500, 'Failed to verify database backup', [error.message]);
    }
  },

  async restoreBackup(backupFile, options = {}) {
    try {
      const dbConfig = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      };

      // Build restore command
      let command = backupConfig.encrypt 
        ? `openssl enc -d -aes-256-cbc -k "${backupConfig.encryptionKey}" < ${backupFile}`
        : `cat ${backupFile}`;

      if (backupConfig.compress) {
        command += ' | gunzip';
      }

      command += ` | psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} ${dbConfig.database}`;

      const startTime = Date.now();
      
      return new Promise((resolve, reject) => {
        exec(command, { env: { PGPASSWORD: dbConfig.password } }, async (error, stdout, stderr) => {
          const duration = Date.now() - startTime;
          
          if (error) {
            await auditLogService.logAction({
              action: 'DB_RESTORE_FAILED',
              entity: 'Database',
              description: `Restore failed: ${stderr}`,
              severity: 'ERROR',
              status: 'FAILED',
              duration,
            });
            
            reject(new ApiError(500, 'Failed to restore database backup', [stderr]));
            return;
          }

          await auditLogService.logAction({
            action: 'DB_RESTORE_SUCCESS',
            entity: 'Database',
            description: 'Database restored successfully',
            severity: 'INFO',
            status: 'SUCCESS',
            duration,
            metadata: {
              backupFile,
              options,
            },
          });

          resolve({
            success: true,
            message: 'Database restored successfully',
            duration,
          });
        });
      });
    } catch (error) {
      throw new ApiError(500, 'Failed to restore database backup', [error.message]);
    }
  },

  async listBackups() {
    try {
      const files = fs.readdirSync(backupConfig.backupDir);
      return files
        .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
        .map(file => ({
          filename: file,
          path: path.join(backupConfig.backupDir, file),
          size: fs.statSync(path.join(backupConfig.backupDir, file)).size,
          timestamp: file.replace(/^backup-|\.sql(\.gz)?(\.enc)?$/g, ''),
          isEncrypted: file.endsWith('.enc'),
          isCompressed: file.endsWith('.gz'),
        }))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (error) {
      throw new ApiError(500, 'Failed to list database backups', [error.message]);
    }
  },

  async cleanupOldBackups() {
    try {
      const backups = await databaseBackupService.listBackups();
      if (backups.length <= backupConfig.maxBackups) return;

      const backupsToDelete = backups.slice(backupConfig.maxBackups);
      for (const backup of backupsToDelete) {
        fs.unlinkSync(backup.path);
      }

      return {
        deleted: backupsToDelete.length,
        remaining: backups.length - backupsToDelete.length,
      };
    } catch (error) {
      throw new ApiError(500, 'Failed to clean up old backups', [error.message]);
    }
  },
};

module.exports = databaseBackupService;
