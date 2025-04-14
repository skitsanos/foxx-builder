/**
 * Delete Preference Endpoint
 * 
 * Removes a specific preference item for the currently authenticated user
 * 
 * @version 1.0.0
 */
const { query, db, time } = require('@arangodb');
const joi = require('joi');

module.exports = {
    contentType: 'application/json',
    name: 'Delete Preference',
    
    // Define path parameters validation
    params: {
        path: {
            key: {
                schema: joi.string().required(),
                description: 'Preference key to delete'
            }
        }
    },
    
    // Define possible errors
    error: [
        {'401': 'Authentication required'},
        {'404': 'User or preference not found'},
        {'500': 'Server error'}
    ],
    
    /**
     * Handle the request to delete a preference
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) => {
        const start = time();
        
        // Check if user is authenticated
        if (!req.user || !req.user._key) {
            return res.throw(401, 'Authentication required');
        }
        
        const userId = req.user._key;
        const { key } = req.pathParams;
        
        try {
            // Get current user preferences
            const [currentUser] = query`
                FOR user IN users
                FILTER user._key == ${userId}
                RETURN {
                    _key: user._key,
                    preferences: user.preferences || {}
                }
            `.toArray();
            
            if (!currentUser) {
                return res.throw(404, 'User not found');
            }
            
            // Clone current preferences
            const updatedPreferences = { ...(currentUser.preferences || {}) };
            
            // Check if preference exists
            if (updatedPreferences[key] === undefined) {
                return res.throw(404, `Preference '${key}' not found`);
            }
            
            // Remove the preference
            delete updatedPreferences[key];
            
            // Update the user's preferences
            const usersCollection = db._collection('users');
            usersCollection.update(userId, { 
                preferences: updatedPreferences,
                updatedAt: new Date().getTime()
            });
            
            // Record audit log
            const auditCollection = db._collection('audit');
            auditCollection.save({
                action: 'preference_deleted',
                targetId: userId,
                timestamp: new Date().getTime(),
                key: key
            });
            
            // Prepare response
            const response = {
                key,
                meta: {
                    message: `Preference '${key}' deleted successfully`,
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error deleting preference '${key}' for user ${userId}:`, error.message);
            res.throw(500, 'Error deleting preference');
        }
    }
};
