/**
 * Database Statistics Task
 * 
 * Collects and records database statistics for monitoring
 * Can be scheduled to run hourly, daily, or weekly
 * 
 * @version 1.0.0
 */
const { db, query } = require('@arangodb');

/**
 * Task handler function
 * 
 * @param {Object} params - Task parameters
 * @param {boolean} params.detailed - Whether to collect detailed statistics
 * @returns {Object} - Task result
 */
module.exports = (params) => {
    try {
        const { detailed = false } = params;
        console.log(`Executing database statistics task with parameters:`, params);
        
        // Get list of collections
        const collections = db._collections()
            .filter(collection => !collection.name().startsWith('_'));
        
        // Prepare result
        const result = {
            timestamp: new Date().getTime(),
            collections: {},
            totalDocuments: 0,
            totalSize: 0
        };
        
        // Collect statistics for each collection
        for (const collection of collections) {
            const name = collection.name();
            const count = collection.count();
            const figures = collection.figures();
            
            result.collections[name] = {
                count,
                size: figures.datafiles.fileSize,
                indexes: collection.indexes().length
            };
            
            if (detailed) {
                result.collections[name].details = {
                    revision: figures.revision,
                    datafiles: figures.datafiles,
                    indexes: figures.indexes
                };
            }
            
            result.totalDocuments += count;
            result.totalSize += figures.datafiles.fileSize;
        }
        
        // Store statistics in a stats collection if it exists
        if (db._collection('systemStats')) {
            db._collection('systemStats').save({
                type: 'database',
                timestamp: result.timestamp,
                data: result
            });
        }
        
        // Log summary
        console.log(`Collected statistics for ${collections.length} collections with ${result.totalDocuments} documents (${Math.round(result.totalSize / 1024 / 1024)} MB)`);
        
        return {
            success: true,
            collections: Object.keys(result.collections),
            totalCollections: collections.length,
            totalDocuments: result.totalDocuments,
            totalSizeMB: Math.round(result.totalSize / 1024 / 1024)
        };
    } catch (error) {
        console.error('Error in database-stats task:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};
