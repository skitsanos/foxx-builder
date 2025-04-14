/**
 * Update User Preferences Endpoint
 * 
 * Updates preferences for the currently authenticated user
 * 
 * @version 1.0.0
 */
const { query, db, time } = require('@arangodb');
const joi = require('joi');

module.exports = {
    contentType: 'application/json',
    name: 'Update User Preferences',
    
    // Define request body validation
    body: {
        model: joi.object({
            theme: joi.string().valid('light', 'dark', 'system', 'auto').optional(),
            language: joi.string().min(2).max(5).optional(),
            notifications: joi.boolean().optional(),
            timezone: joi.string().optional(),
            dateFormat: joi.string().optional(),
            timeFormat: joi.string().valid('12h', '24h').optional(),
            defaultView: joi.string().optional(),
            fontScale: joi.number().min(0.5).max(2).optional(),
            reducedMotion: joi.boolean().optional(),
            highContrast: joi.boolean().optional(),
            dashboardLayout: joi.object().optional(),
            custom: joi.object().optional()
        }).required()
    },
    
    // Define possible errors
    error: [
        {'401': 'Authentication required'},
        {'400': 'Invalid preferences data'},
        {'404': 'User not found'},
        {'500': 'Server error'}
    ],
    
    /**
     * Handle the request to update user preferences
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
        const newPreferences = req.body;
        
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
            
            // Merge with existing preferences
            const updatedPreferences = {
                ...(currentUser.preferences || {}),
                ...newPreferences
            };
            
            // Update the user's preferences
            const usersCollection = db._collection('users');
            usersCollection.update(userId, { 
                preferences: updatedPreferences,
                updatedAt: new Date().getTime()
            });
            
            // Record audit log
            const auditCollection = db._collection('audit');
            auditCollection.save({
                action: 'preferences_updated',
                targetId: userId,
                timestamp: new Date().getTime(),
                fields: Object.keys(newPreferences)
            });
            
            // Prepare response with updated preferences
            const response = {
                preferences: updatedPreferences,
                meta: {
                    message: 'Preferences updated successfully',
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error updating preferences for user ${userId}:`, error.message);
            res.throw(500, 'Error updating preferences');
        }
    }
};
