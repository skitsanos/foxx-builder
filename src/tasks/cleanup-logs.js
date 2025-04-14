/**
 * Cleanup Logs Task
 * 
 * Removes old logs and activity records to prevent database bloat
 * Can be scheduled to run daily, weekly, or monthly
 * 
 * @version 1.0.0
 */
const { db, query } = require('@arangodb');

/**
 * Task handler function
 * 
 * @param {Object} params - Task parameters
 * @param {number} params.olderThan - Remove records older than this many days
 * @param {boolean} params.dryRun - If true, only log what would be deleted
 * @returns {Object} - Task result
 */
module.exports = (params) => {
    try {
        const { olderThan = 30, dryRun = false } = params;
        console.log(`Executing log cleanup task with parameters:`, params);
        
        // Calculate cutoff date (milliseconds)
        const now = new Date().getTime();
        const cutoffTime = now - (olderThan * 24 * 60 * 60 * 1000);
        
        // Log the cutoff date for reference
        console.log(`Removing logs older than ${new Date(cutoffTime).toISOString()} (${olderThan} days old)`);
        
        // Process each collection
        const result = {
            userActivities: 0,
            audit: 0,
            totalRemoved: 0
        };
        
        // Cleanup user activities
        if (db._collection('userActivities')) {
            const activitiesCount = query`
                FOR activity IN userActivities
                FILTER activity.timestamp < ${cutoffTime}
                COLLECT WITH COUNT INTO count
                RETURN count
            `.toArray()[0] || 0;
            
            if (!dryRun && activitiesCount > 0) {
                query`
                    FOR activity IN userActivities
                    FILTER activity.timestamp < ${cutoffTime}
                    REMOVE activity IN userActivities
                `;
            }
            
            result.userActivities = activitiesCount;
            result.totalRemoved += activitiesCount;
            console.log(`Found ${activitiesCount} user activities to remove`);
        }
        
        // Cleanup audit logs
        if (db._collection('audit')) {
            const auditCount = query`
                FOR log IN audit
                FILTER log.timestamp < ${cutoffTime}
                COLLECT WITH COUNT INTO count
                RETURN count
            `.toArray()[0] || 0;
            
            if (!dryRun && auditCount > 0) {
                query`
                    FOR log IN audit
                    FILTER log.timestamp < ${cutoffTime}
                    REMOVE log IN audit
                `;
            }
            
            result.audit = auditCount;
            result.totalRemoved += auditCount;
            console.log(`Found ${auditCount} audit logs to remove`);
        }
        
        // Log the result
        if (dryRun) {
            console.log(`DRY RUN: Would have removed ${result.totalRemoved} logs`);
        } else {
            console.log(`Successfully removed ${result.totalRemoved} logs`);
        }
        
        return {
            success: true,
            ...result,
            dryRun
        };
    } catch (error) {
        console.error('Error in cleanup-logs task:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};
