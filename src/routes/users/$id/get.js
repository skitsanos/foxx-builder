/**
 * Get user by ID
 * 
 * Fetches a single user by their ID with detailed information
 * and proper error handling when the user is not found
 * 
 * @version 1.0.0
 */
const { aql, query, time } = require('@arangodb');
const crypto = require('@arangodb/crypto');
const joi = require('joi');

module.exports = {
    contentType: 'application/json',
    name: 'Get user by ID',
    
    // Define path parameters validation
    params: {
        path: {
            id: {
                schema: joi.string().required(),
                description: 'User ID'
            }
        }
    },
    
    // Define possible errors
    error: [
        {'404': 'User not found'},
        {'500': 'Database error'}
    ],
    
    /**
     * Handles the request to get a user by ID
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) => {
        const { id } = req.pathParams;
        const { utils } = module.context;
        const start = time();
        
        try {
            // Get user from database
            const [user] = query`
                FOR user IN users
                FILTER user._key == ${id}
                RETURN UNSET(user, "_id", "_rev", "password")
            `.toArray();
            
            // Check if user exists
            if (!user) {
                return res.throw(404, 'User not found');
            }
            
            // Add Gravatar URL if user has an email
            if (user.email && utils.isEmail(user.email)) {
                user.gravatar = `https://www.gravatar.com/avatar/${crypto.md5(user.email)}?d=robohash&s=150`;
            }
            
            // Get user stats if available
            const stats = this.getUserStats(id);
            
            // Prepare response
            const response = {
                user,
                stats,
                meta: {
                    requestId: req.requestId,
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error fetching user ${id}:`, error.message);
            res.throw(500, 'Error retrieving user data');
        }
    },
    
    /**
     * Gets additional user statistics
     * 
     * @param {String} userId - User ID
     * @returns {Object} User statistics
     */
    getUserStats(userId) {
        try {
            // This could be extended to include more user statistics
            // For example, count of activities, last login time, etc.
            const [stats] = query`
                LET lastLogin = (
                    FOR activity IN userActivities
                    FILTER activity.userId == ${userId} AND activity.type == 'login'
                    SORT activity.timestamp DESC
                    LIMIT 1
                    RETURN activity.timestamp
                )[0]
                
                LET activityCount = (
                    FOR activity IN userActivities
                    FILTER activity.userId == ${userId}
                    COLLECT WITH COUNT INTO count
                    RETURN count
                )[0]
                
                RETURN {
                    lastLogin: lastLogin,
                    activityCount: activityCount || 0,
                    accountAge: DOCUMENT(users, ${userId}).createdOn 
                        ? DATE_DIFF(DOCUMENT(users, ${userId}).createdOn, DATE_NOW(), "day") 
                        : null
                }
            `.toArray();
            
            return stats || {};
        } catch (error) {
            console.warn(`Could not retrieve stats for user ${userId}:`, error.message);
            return {};
        }
    }
};
