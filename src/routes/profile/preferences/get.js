/**
 * Get User Preferences Endpoint
 * 
 * Retrieves the preferences for the currently authenticated user
 * 
 * @version 1.0.0
 */
const { query, time } = require('@arangodb');

module.exports = {
    contentType: 'application/json',
    name: 'Get User Preferences',
    
    // Define possible errors
    error: [
        {'401': 'Authentication required'},
        {'404': 'User not found'},
        {'500': 'Server error'}
    ],
    
    /**
     * Handle the request to get user preferences
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
        
        try {
            // Get user preferences
            const [result] = query`
                LET user = DOCUMENT(users, ${userId})
                
                RETURN {
                    preferences: user.preferences || {},
                    defaults: {
                        theme: "light",
                        language: "en",
                        notifications: true,
                        timezone: "UTC",
                        dateFormat: "MM/DD/YYYY",
                        timeFormat: "12h"
                    }
                }
            `.toArray();
            
            if (!result) {
                return res.throw(404, 'User not found');
            }
            
            // Merge defaults with user preferences
            const mergedPreferences = {
                ...result.defaults,
                ...(result.preferences || {})
            };
            
            // Prepare response
            const response = {
                preferences: mergedPreferences,
                meta: {
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error fetching preferences for user ${userId}:`, error.message);
            res.throw(500, 'Error retrieving preferences');
        }
    }
};
