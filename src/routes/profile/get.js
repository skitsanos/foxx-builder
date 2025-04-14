/**
 * Get User Profile Endpoint
 * 
 * Retrieves the profile information for the currently authenticated user
 * 
 * @version 1.0.0
 */
const { query, time } = require('@arangodb');
const crypto = require('@arangodb/crypto');

module.exports = {
    contentType: 'application/json',
    name: 'Get User Profile',
    
    // Define possible errors
    error: [
        {'401': 'Authentication required'},
        {'404': 'Profile not found'},
        {'500': 'Server error'}
    ],
    
    /**
     * Handle the request to get user profile
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
            // Get user profile with roles
            const [profile] = query`
                LET user = DOCUMENT(users, ${userId})
                
                LET userRoles = (
                    FOR roleId IN user.roles || []
                    LET role = DOCUMENT(roles, roleId)
                    FILTER role != null
                    RETURN {
                        _key: role._key,
                        name: role.name,
                        permissions: role.permissions || []
                    }
                )
                
                LET permissions = UNIQUE(
                    FLATTEN(
                        FOR role IN userRoles
                        RETURN role.permissions || []
                    )
                )
                
                // Get activity stats
                LET lastActivities = (
                    FOR activity IN userActivities
                    FILTER activity.userId == ${userId}
                    SORT activity.timestamp DESC
                    LIMIT 5
                    RETURN {
                        type: activity.type,
                        timestamp: activity.timestamp,
                        dateTime: DATE_ISO8601(activity.timestamp)
                    }
                )
                
                LET stats = {
                    lastLogin: (
                        FOR activity IN userActivities
                        FILTER activity.userId == ${userId} AND activity.type == 'login'
                        SORT activity.timestamp DESC
                        LIMIT 1
                        RETURN activity.timestamp
                    )[0],
                    totalLogins: (
                        FOR activity IN userActivities
                        FILTER activity.userId == ${userId} AND activity.type == 'login'
                        COLLECT WITH COUNT INTO count
                        RETURN count
                    )[0] || 0,
                    accountAge: DATE_DIFF(user.createdOn, DATE_NOW(), "day")
                }
                
                RETURN {
                    user: UNSET(user, "_id", "_rev", "password"),
                    roles: userRoles,
                    permissions: permissions,
                    stats: stats,
                    recentActivity: lastActivities
                }
            `.toArray();
            
            if (!profile || !profile.user) {
                return res.throw(404, 'Profile not found');
            }
            
            // Add gravatar if email is available
            if (profile.user.email) {
                profile.user.gravatar = `https://www.gravatar.com/avatar/${crypto.md5(profile.user.email)}?d=robohash&s=150`;
            }
            
            // Prepare response
            const response = {
                ...profile,
                meta: {
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error fetching profile for user ${userId}:`, error.message);
            res.throw(500, 'Error retrieving profile data');
        }
    }
};
