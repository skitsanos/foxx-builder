/**
 * Script Task Examples for Foxx Builder Scheduler
 * 
 * Script tasks execute custom JavaScript functions defined in the src/scripts/ directory.
 * They are ideal for data processing, maintenance tasks, and business logic execution.
 */

const { runTask } = module.context;

// Example: Daily database cleanup task
function createDailyCleanupTask() {
    return runTask(
        'daily-db-cleanup',           // Unique task name
        'cleanup-logs',               // Script path: src/scripts/cleanup-logs.js
        { 
            days: 30,                 // Delete logs older than 30 days
            collections: ['logs', 'audit_trail']
        },
        24 * 60 * 60 * 1000          // Run every 24 hours
    );
}

// Example: Weekly report generation
function createWeeklyReportTask() {
    return runTask(
        'weekly-analytics-report',
        'generate-report',            // Script path: src/scripts/generate-report.js
        {
            reportType: 'analytics',
            format: 'pdf',
            recipients: ['admin@example.com', 'analytics@example.com']
        },
        7 * 24 * 60 * 60 * 1000      // Run every 7 days
    );
}

// Example: Hourly data synchronization
function createDataSyncTask() {
    return runTask(
        'hourly-data-sync',
        'sync-external-data',         // Script path: src/scripts/sync-external-data.js
        {
            source: 'external-api',
            target: 'local-cache',
            batchSize: 100
        },
        60 * 60 * 1000               // Run every hour
    );
}

// Example: One-time migration task
function createMigrationTask() {
    return runTask(
        'user-data-migration-v2',
        'migrate-user-data',          // Script path: src/scripts/migrate-user-data.js
        {
            fromVersion: '1.0',
            toVersion: '2.0',
            dryRun: false
        },
        0                            // Run once (period = 0)
    );
}

// Example: Backup task with custom schedule
function createBackupTask() {
    return runTask(
        'database-backup',
        'create-backup',              // Script path: src/scripts/create-backup.js
        {
            collections: ['users', 'orders', 'products'],
            compression: 'gzip',
            destination: 's3://backups/daily/'
        },
        2 * 60 * 60 * 1000           // Run every 2 hours
    );
}

// Example: Performance monitoring task
function createMonitoringTask() {
    return runTask(
        'performance-monitor',
        'collect-metrics',            // Script path: src/scripts/collect-metrics.js
        {
            metrics: ['cpu', 'memory', 'disk', 'database'],
            alertThresholds: {
                cpu: 80,
                memory: 85,
                disk: 90
            }
        },
        5 * 60 * 1000                // Run every 5 minutes
    );
}

/**
 * Example script file content for reference:
 * 
 * // src/scripts/cleanup-logs.js
 * module.exports = ({ days, collections, context }) => {
 *     try {
 *         const { db } = require('@arangodb');
 *         const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
 *         
 *         for (const collection of collections) {
 *             const result = db._query(`
 *                 FOR doc IN ${collection}
 *                 FILTER doc.timestamp < @cutoff
 *                 REMOVE doc IN ${collection}
 *                 RETURN OLD
 *             `, { cutoff: cutoffDate });
 *             
 *             console.log(`Cleaned ${result.toArray().length} records from ${collection}`);
 *         }
 *         
 *         return { success: true, cleanedCollections: collections };
 *     } catch (error) {
 *         console.error('Cleanup failed:', error);
 *         throw error;
 *     }
 * };
 */

module.exports = {
    createDailyCleanupTask,
    createWeeklyReportTask,
    createDataSyncTask,
    createMigrationTask,
    createBackupTask,
    createMonitoringTask
};