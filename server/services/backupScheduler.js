const { schedule } = require('node-schedule');
const databaseBackupService = require('./databaseBackupService');
const { ApiError } = require('../middleware/errorHandler');

// Schedule backup at 2 AM every day
const backupSchedule = process.env.DB_BACKUP_SCHEDULE || '0 2 * * *';

const backupScheduler = {
  start() {
    console.log('Starting backup scheduler...');
    
    // Schedule daily backup
    schedule.scheduleJob(backupSchedule, async () => {
      try {
        console.log('Starting scheduled backup...');
        const result = await databaseBackupService.createBackup();
        console.log(`Backup completed successfully: ${result.backupFile}`);
      } catch (error) {
        console.error('Backup failed:', error.message);
        // Send notification about backup failure
        // This would typically be sent to an admin email or monitoring system
      }
    });

    // Schedule cleanup of old backups
    schedule.scheduleJob('0 3 * * *', async () => { // Run at 3 AM
      try {
        console.log('Starting backup cleanup...');
        const result = await databaseBackupService.cleanupOldBackups();
        console.log(`Backup cleanup completed: Deleted ${result.deleted} backups, ${result.remaining} remaining`);
      } catch (error) {
        console.error('Backup cleanup failed:', error.message);
      }
    });
  },

  stop() {
    console.log('Stopping backup scheduler...');
    schedule.gracefulShutdown();
  },
};

// Start the scheduler when the module is loaded
backupScheduler.start();

module.exports = backupScheduler;
