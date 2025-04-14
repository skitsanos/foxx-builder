/**
 * Get User Activities Endpoint
 * 
 * Retrieves activity history for a specific user
 * Includes pagination and filtering by activity type
 * 
 * @version 1.0.0
 */
const { aql, query, time } = require('@arangodb');
const joi = require('joi');

module.exports = {
    contentType: 'application/json',
    name: 'Get User Activities',
    
    // Define path parameters validation
    params: {
        path: {
            id: {
                schema: joi.string().required(),
                description: 'User ID'
            }
        },
        query: {
            skip: {
                schema: joi.number().integer().min(0).default(0),
                description: 'Number of records to skip'
            },
            limit: {
                schema: joi.number().integer().min(1).max(100).default(20),
                description: 'Maximum number of records to return'
            },
            type: {
                schema: joi.string().valid('login', 'logout', 'signup', 'all').default('all'),
                description: 'Activity type filter'
            }
        }
    },
    
    // Define possible errors
    error: [
        {'404': 'User not found'},
        {'403': 'Access denied'},
        {'500': 'Database error'}
    ],
    
    /**
     * Handle the request to get user activities
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) => {
        const { id } = req.pathParams;
        const { skip = 0, limit = 20, type = 'all' } = req.queryParams;
        const start = time();
        
        // Check if requesting user has permission to view these activities
        // Either the user is viewing their own activities or has admin role
        if (req.user && (req.user._key === id || (req.user.roles && req.user.roles.includes('admin')))) {
            try {
                // Check if user exists
                const userExists = query`
                    RETURN LENGTH(
                        FOR user IN users
                        FILTER user._key == ${id}
                        LIMIT 1
                        RETURN 1
                    )
                `.toArray()[0];
                
                if (!userExists) {
                    return res.throw(404, 'User not found');
                }
                
                // Build type filter
                const typeFilter = type !== 'all' 
                    ? aql`FILTER activity.type == ${type}` 
                    : aql``;
                
                // Get activities with pagination
                const activities = query`
                    LET activities = (
                        FOR activity IN userActivities
                        FILTER activity.userId == ${id}
                        ${typeFilter}
                        SORT activity.timestamp DESC
                        LIMIT ${parseInt(skip)}, ${parseInt(limit)}
                        RETURN {
                            _key: activity._key,
                            type: activity.type,
                            timestamp: activity.timestamp,
                            ipAddress: activity.ipAddress,
                            userAgent: activity.userAgent,
                            // Format date for display
                            dateTime: DATE_ISO8601(activity.timestamp)
                        }
                    )
                    
                    LET total = (
                        FOR activity IN userActivities
                        FILTER activity.userId == ${id}
                        ${typeFilter}
                        COLLECT WITH COUNT INTO count
                        RETURN count
                    )[0]
                    
                    RETURN {
                        activities: activities,
                        total: total,
                        skip: ${parseInt(skip)},
                        limit: ${parseInt(limit)}
                    }
                `.toArray()[0];
                
                // Prepare response
                const response = {
                    ...activities,
                    meta: {
                        execTime: time() - start
                    }
                };
                
                res.send(response);
            } catch (error) {
                console.error(`Error fetching activities for user ${id}:`, error.message);
                res.throw(500, 'Error retrieving activity data');
            }
        } else {
            res.throw(403, 'Access denied');
        }
    }
};
