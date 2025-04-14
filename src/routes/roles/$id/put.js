/**
 * Update Role Endpoint
 * 
 * Updates an existing role with new attributes
 * Restricted to admin users only
 * System roles cannot be modified
 * 
 * @version 1.0.0
 */
const { query, db, time } = require('@arangodb');
const joi = require('joi');

module.exports = {
    contentType: 'application/json',
    name: 'Update Role',
    
    // Define path parameters validation
    params: {
        path: {
            id: {
                schema: joi.string().required(),
                description: 'Role ID'
            }
        }
    },
    
    // Define request body validation
    body: {
        model: joi.object({
            name: joi.string().min(3).max(50),
            description: joi.string().max(200),
            permissions: joi.array().items(joi.string()).min(1)
        }).required()
    },
    
    // Define possible errors
    error: [
        {'403': 'Access denied'},
        {'404': 'Role not found'},
        {'400': 'Invalid role data'},
        {'409': 'Cannot modify system role'},
        {'500': 'Database error'}
    ],
    
    /**
     * Handle the request to update a role
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) => {
        const { id } = req.pathParams;
        const updateData = req.body;
        const start = time();
        
        // Check if user has admin role
        if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
            return res.throw(403, 'Access denied: admin role required');
        }
        
        try {
            // Fetch current role data
            const [currentRole] = query`
                FOR role IN roles
                FILTER role._key == ${id}
                RETURN role
            `.toArray();
            
            if (!currentRole) {
                return res.throw(404, 'Role not found');
            }
            
            // Prevent modification of system roles
            if (currentRole.isSystem) {
                return res.throw(409, 'System roles cannot be modified');
            }
            
            // Check if name is being changed and if it's already taken
            if (updateData.name && updateData.name !== currentRole.name) {
                const nameExists = query`
                    RETURN LENGTH(
                        FOR role IN roles
                        FILTER role.name == ${updateData.name} AND role._key != ${id}
                        LIMIT 1
                        RETURN 1
                    )
                `.toArray()[0];
                
                if (nameExists) {
                    return res.throw(409, `Role name "${updateData.name}" is already taken`);
                }
            }
            
            // Prepare update document
            const update = {
                ...updateData,
                updatedAt: new Date().getTime(),
                updatedBy: req.user._key
            };
            
            // Update the role
            const rolesCollection = db._collection('roles');
            const updated = rolesCollection.update(id, update);
            
            // Fetch the updated role
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
                    updatedAt: role.updatedAt
                }
            `.toArray();
            
            // Prepare response
            const response = {
                role,
                meta: {
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error updating role ${id}:`, error.message);
            res.throw(500, 'Error updating role');
        }
    }
};
