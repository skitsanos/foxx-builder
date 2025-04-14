/**
 * Update User Roles Endpoint
 * 
 * Assigns or updates roles for a user
 * Restricted to admin users only
 * 
 * @version 1.0.0
 */
const { query, db, time } = require('@arangodb');
const joi = require('joi');

module.exports = {
    contentType: 'application/json',
    name: 'Update User Roles',
    
    // Define path parameters validation
    params: {
        path: {
            id: {
                schema: joi.string().required(),
                description: 'User ID'
            }
        }
    },
    
    // Define request body validation
    body: {
        model: joi.object({
            roles: joi.array().items(joi.string()).required().min(0),
            reason: joi.string().optional()
        }).required()
    },
    
    // Define possible errors
    error: [
        {'403': 'Access denied'},
        {'404': 'User not found'},
        {'400': 'Invalid role data'},
        {'422': 'Some roles do not exist'},
        {'500': 'Database error'}
    ],
    
    /**
     * Handle the request to update user roles
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) => {
        const { id } = req.pathParams;
        const { roles, reason } = req.body;
        const start = time();
        
        // Check if requesting user has admin role
        if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
            return res.throw(403, 'Access denied: admin role required');
        }
        
        try {
            // Check if user exists
            const [user] = query`
                FOR user IN users
                FILTER user._key == ${id}
                RETURN user
            `.toArray();
            
            if (!user) {
                return res.throw(404, 'User not found');
            }
            
            // Verify that all roles exist
            const roleIds = roles;
            const [validationResult] = query`
                LET providedRoles = ${roleIds}
                LET existingRoles = (
                    FOR roleId IN providedRoles
                    FILTER DOCUMENT(roles, roleId) != null
                    RETURN roleId
                )
                
                LET invalidRoles = MINUS(providedRoles, existingRoles)
                
                RETURN {
                    valid: LENGTH(invalidRoles) == 0,
                    invalidRoles: invalidRoles
                }
            `.toArray();
            
            if (!validationResult.valid) {
                return res.throw(422, `The following role IDs do not exist: ${validationResult.invalidRoles.join(', ')}`);
            }
            
            // Get existing roles for audit
            const previousRoles = user.roles || [];
            
            // Update user's roles
            const usersCollection = db._collection('users');
            usersCollection.update(id, { 
                roles: roleIds,
                updatedAt: new Date().getTime(),
                updatedBy: req.user._key
            });
            
            // Record the role change in audit log
            const auditCollection = db._collection('audit');
            auditCollection.save({
                action: 'user_roles_updated',
                targetId: id,
                previousRoles,
                newRoles: roleIds,
                reason: reason || 'No reason provided',
                performedBy: req.user._key,
                timestamp: new Date().getTime()
            });
            
            // Get updated roles with details
            const [result] = query`
                LET roleDetails = (
                    FOR roleId IN ${roleIds}
                    LET role = DOCUMENT(roles, roleId)
                    FILTER role != null
                    RETURN {
                        _key: role._key,
                        name: role.name,
                        description: role.description
                    }
                )
                
                RETURN {
                    user: {
                        _key: ${id},
                        username: DOCUMENT(users, ${id}).username
                    },
                    roles: roleDetails,
                    totalRoles: LENGTH(roleDetails)
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
            console.error(`Error updating roles for user ${id}:`, error.message);
            res.throw(500, 'Error updating user roles');
        }
    }
};
