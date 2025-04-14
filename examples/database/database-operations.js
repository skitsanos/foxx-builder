/**
 * Example usage of enhanced database operations
 * 
 * This file demonstrates how to use the enhanced database operations
 * in your Foxx service routes.
 */

// User example route handler
module.exports = {
    contentType: 'application/json',
    name: 'User operations example',
    
    /**
     * Example handler showing different database operations
     */
    handler: (req, res) => {
        // Using the enhanced database operations
        const { db, transaction } = module.context;
        
        // Basic CRUD operations
        
        // Create a user
        const newUser = db.insert('users', {
            username: 'johndoe',
            email: 'john@example.com',
            status: 'active'
        });
        
        // Find users with field projection
        const activeUsers = db.find('users', { status: 'active' }, {
            fields: ['username', 'email'],
            limit: 10
        });
        
        // Update user with options
        const updatedUser = db.update('users', newUser._key, {
            lastLoginDate: new Date().toISOString()
        }, {
            returnNew: true,
            keepNull: false
        });
        
        // Using transactions
        const result = transaction.execute(function(params) {
            const { userId, profileData } = params;
            
            // Get collections
            const users = require('@arangodb').db._collection('users');
            const profiles = require('@arangodb').db._collection('profiles');
            
            // Update user
            const user = users.update(userId, { hasProfile: true });
            
            // Create profile
            const profile = profiles.insert({
                userId: userId,
                ...profileData
            });
            
            return { user, profile };
        }, {
            write: ['users', 'profiles']
        }, {
            params: {
                userId: newUser._key,
                profileData: { bio: 'Hello world' }
            }
        });
        
        // Using transaction builder (fluent API)
        const batchResult = transaction.builder()
            .update('users', newUser._key, { verified: true })
            .insert('logs', { 
                action: 'verify',
                userId: newUser._key,
                timestamp: Date.now()
            })
            .execute();
        
        // Using batch operations
        const newUsers = db.insertMany('users', [
            { username: 'user1', email: 'user1@example.com' },
            { username: 'user2', email: 'user2@example.com' }
        ]);
        
        // Using update many
        const updateResult = db.updateMany('users', 
            { status: 'pending' }, 
            { status: 'active', updatedBy: 'system' }
        );
        
        // Querying with caching
        const cachedUsers = db.find('users', { status: 'active' }, {
            useCache: true,
            cacheTtl: 60000, // 1 minute
            skip: 0,
            limit: 5,
            sort: { createdOn: -1 } // Newest first
        });
        
        // Response with all examples
        res.json({
            newUser,
            activeUsers,
            updatedUser,
            transactionResult: result,
            batchResult,
            newUsers,
            updateResult,
            cachedUsers,
            cacheStats: db.getCacheStats()
        });
    }
};
