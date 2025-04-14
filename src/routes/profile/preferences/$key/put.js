/**
 * Update Single Preference Endpoint
 * 
 * Updates a specific preference item for the currently authenticated user
 * 
 * @version 1.0.0
 */
const { query, db, time } = require('@arangodb');
const joi = require('joi');

module.exports = {
    contentType: 'application/json',
    name: 'Update Single Preference',
    
    // Define path parameters validation
    params: {
        path: {
            key: {
                schema: joi.string().required(),
                description: 'Preference key to update'
            }
        }
    },
    
    // Define request body validation
    body: {
        model: joi.alternatives().try(
            joi.string(),
            joi.number(),
            joi.boolean(),
            joi.object(),
            joi.array()
        ).required()
    },
    
    // Define possible errors
    error: [
        {'401': 'Authentication required'},
        {'400': 'Invalid preference value'},
        {'404': 'User not found'},
        {'500': 'Server error'}
    ],
    
    /**
     * Handle the request to update a single preference
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
        const value = req.body;
        
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
            
            // Update the specific preference
            updatedPreferences[key] = value;
            
            // Update the user's preferences
            const usersCollection = db._collection('users');
            usersCollection.update(userId, { 
                preferences: updatedPreferences,
                updatedAt: new Date().getTime()
            });
            
            // Record audit log
            const auditCollection = db._collection('audit');
            auditCollection.save({
                action: 'preference_updated',
                targetId: userId,
                timestamp: new Date().getTime(),
                key: key
            });
            
            // Prepare response with updated preference
            const response = {
                key,
                value,
                meta: {
                    message: `Preference '${key}' updated successfully`,
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error updating preference '${key}' for user ${userId}:`, error.message);
            res.throw(500, 'Error updating preference');
        }
    }
};
