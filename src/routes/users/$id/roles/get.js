/**
 * Get User Roles Endpoint
 * 
 * Retrieves roles assigned to a specific user
 * Users can view their own roles, admins can view any user's roles
 * 
 * @version 1.0.0
 */
const { query, time } = require('@arangodb');
const joi = require('joi');

module.exports = {
    contentType: 'application/json',
    name: 'Get User Roles',
    
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
        {'403': 'Access denied'},
        {'404': 'User not found'},
        {'500': 'Database error'}
    ],
    
    /**
     * Handle the request to get user roles
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) => {
        const { id } = req.pathParams;
        const start = time();
        
        // Check if user exists
        const [userExists] = query`
            FOR user IN users
            FILTER user._key == ${id}
            RETURN 1
        `.toArray();
        
        if (!userExists) {
            return res.throw(404, 'User not found');
        }
        
        // Check if requesting user has permission
        // Either the user is viewing their own roles or has admin role
        const isOwnUser = req.user && req.user._key === id;
        const isAdmin = req.user && req.user.roles && req.user.roles.includes('admin');
        
        if (!isOwnUser && !isAdmin) {
            return res.throw(403, 'Access denied');
        }
        
        try {
            // Get roles for user
            const [result] = query`
                LET user = DOCUMENT(users, ${id})
                
                LET roleIds = user.roles || []
                
                LET roles = (
                    FOR roleId IN roleIds
                    LET role = DOCUMENT(roles, roleId)
                    FILTER role != null
                    RETURN {
                        _key: role._key,
                        name: role.name,
                        description: role.description,
                        permissions: role.permissions,
                        isSystem: role.isSystem || false
                    }
                )
                
                LET effectivePermissions = UNIQUE(
                    FLATTEN(
                        FOR role IN roles
                        RETURN role.permissions || []
                    )
                )
                
                RETURN {
                    roles: roles,
                    totalRoles: LENGTH(roles),
                    effectivePermissions: effectivePermissions
                }
            `.toArray();
            
            // Prepare response
            const response = {
                ...result,
                meta: {
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error fetching roles for user ${id}:`, error.message);
            res.throw(500, 'Error retrieving role data');
        }
    }
};
