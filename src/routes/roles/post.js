/**
 * Create Role Endpoint
 * 
 * Creates a new role with specified permissions
 * Restricted to admin users only
 * 
 * @version 1.0.0
 */
const { db, time } = require('@arangodb');
const joi = require('joi');

module.exports = {
    contentType: 'application/json',
    name: 'Create Role',
    
    // Define request body validation
    body: {
        model: joi.object({
            name: joi.string().required().min(3).max(50),
            description: joi.string().required().max(200),
            permissions: joi.array().items(joi.string()).required().min(1)
        }).required()
    },
    
    // Define possible errors
    error: [
        {'403': 'Access denied'},
        {'409': 'Role already exists'},
        {'400': 'Invalid role data'},
        {'500': 'Database error'}
    ],
    
    /**
     * Handle the request to create a new role
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) => {
        const start = time();
        const { name, description, permissions } = req.body;
        
        // Check if user has admin role
        if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
            return res.throw(403, 'Access denied: admin role required');
        }
        
        try {
            // Check if role with this name already exists
            const rolesCollection = db._collection('roles');
            const existingRole = rolesCollection.firstExample({ name });
            
            if (existingRole) {
                return res.throw(409, `Role "${name}" already exists`);
            }
            
            // Create new role
            const role = rolesCollection.save({
                name,
                description,
                permissions,
                isSystem: false,
                createdAt: new Date().getTime(),
                createdBy: req.user._key
            });
            
            // Prepare response
            const response = {
                role: {
                    _key: role._key,
                    name,
                    description,
                    permissions
                },
                meta: {
                    execTime: time() - start
                }
            };
            
            res.status(201).send(response);
        } catch (error) {
            console.error(`Error creating role:`, error.message);
            res.throw(500, 'Error creating role');
        }
    }
};
