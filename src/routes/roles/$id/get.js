/**
 * Get Role by ID Endpoint
 * 
 * Retrieves details of a specific role
 * Restricted to admin users only
 * 
 * @version 1.0.0
 */
const { query, time } = require('@arangodb');
const joi = require('joi');

module.exports = {
    contentType: 'application/json',
    name: 'Get Role by ID',
    
    // Define path parameters validation
    params: {
        path: {
            id: {
                schema: joi.string().required(),
                description: 'Role ID'
            }
        }
    },
    
    // Define possible errors
    error: [
        {'403': 'Access denied'},
        {'404': 'Role not found'},
        {'500': 'Database error'}
    ],
    
    /**
     * Handle the request to get a role by ID
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) => {
        const { id } = req.pathParams;
        const start = time();
        
        // Check if user has admin role
        if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
            return res.throw(403, 'Access denied: admin role required');
        }
        
        try {
            // Query role by ID
            const [role] = query`
                FOR role IN roles
                FILTER role._key == ${id}
                RETURN {
                    _key: role._key,
                    name: role.name,
                    description: role.description,
                    permissions: role.permissions,
                    isSystem: role.isSystem || false,
                    createdAt: role.createdAt,
                    createdBy: role.createdBy
                }
            `.toArray();
            
            if (!role) {
                return res.throw(404, 'Role not found');
            }
            
            // Get count of users with this role
            const [userCount] = query`
                FOR user IN users
                FILTER ${id} IN user.roles
                COLLECT WITH COUNT INTO count
                RETURN count
            `.toArray();
            
            // Prepare response
            const response = {
                role,
                stats: {
                    userCount: userCount || 0
                },
                meta: {
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error fetching role ${id}:`, error.message);
            res.throw(500, 'Error retrieving role data');
        }
    }
};
