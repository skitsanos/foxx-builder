/**
 * Get Roles Endpoint
 * 
 * List all available roles with their permissions
 * Restricted to admin users only
 * 
 * @version 1.0.0
 */
const { aql, query, time } = require('@arangodb');
const joi = require('joi');

module.exports = {
    contentType: 'application/json',
    name: 'Get Roles',
    
    // Define query parameters for pagination
    params: {
        query: {
            skip: {
                schema: joi.number().integer().min(0).default(0),
                description: 'Number of records to skip'
            },
            limit: {
                schema: joi.number().integer().min(1).max(100).default(20),
                description: 'Maximum number of records to return'
            }
        }
    },
    
    // Define possible errors
    error: [
        {'403': 'Access denied'},
        {'500': 'Database error'}
    ],
    
    /**
     * Handle the request to get available roles
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) => {
        const { skip = 0, limit = 20 } = req.queryParams;
        const start = time();
        
        // Validate pagination parameters
        const validLimit = Math.min(parseInt(limit) || 20, 100);
        const validSkip = parseInt(skip) || 0;
        
        // Check if user has admin role
        if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
            return res.throw(403, 'Access denied: admin role required');
        }
        
        try {
            // Query roles from dedicated collection
            const result = query`
                LET roles = (
                    FOR role IN roles
                    SORT role.name ASC
                    LIMIT ${validSkip}, ${validLimit}
                    RETURN {
                        _key: role._key,
                        name: role.name,
                        description: role.description,
                        permissions: role.permissions,
                        isSystem: role.isSystem || false,
                        createdAt: role.createdAt
                    }
                )
                
                LET total = (
                    FOR role IN roles
                    COLLECT WITH COUNT INTO count
                    RETURN count
                )[0]
                
                RETURN {
                    roles: roles,
                    total: total,
                    skip: ${validSkip},
                    limit: ${validLimit}
                }
            `.toArray()[0];
            
            // Prepare response
            const response = {
                ...result,
                meta: {
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error fetching roles:`, error.message);
            res.throw(500, 'Error retrieving roles data');
        }
    }
};
