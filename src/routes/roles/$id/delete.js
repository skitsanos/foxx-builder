/**
 * Delete Role Endpoint
 * 
 * Deletes a role if it's not used by any users
 * Restricted to admin users only
 * System roles cannot be deleted
 * 
 * @version 1.0.0
 */
const { query, db, time } = require('@arangodb');
const joi = require('joi');

module.exports = {
    contentType: 'application/json',
    name: 'Delete Role',
    
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
        {'409': 'Role is in use or is a system role'},
        {'500': 'Database error'}
    ],
    
    /**
     * Handle the request to delete a role
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
            // Fetch current role data
            const [currentRole] = query`
                FOR role IN roles
                FILTER role._key == ${id}
                RETURN role
            `.toArray();
            
            if (!currentRole) {
                return res.throw(404, 'Role not found');
            }
            
            // Prevent deletion of system roles
            if (currentRole.isSystem) {
                return res.throw(409, 'System roles cannot be deleted');
            }
            
            // Check if role is used by any users
            const [userCount] = query`
                FOR user IN users
                FILTER ${id} IN user.roles
                COLLECT WITH COUNT INTO count
                RETURN count
            `.toArray();
            
            if (userCount > 0) {
                return res.throw(409, `Role is currently assigned to ${userCount} users and cannot be deleted`);
            }
            
            // Delete the role
            const rolesCollection = db._collection('roles');
            rolesCollection.remove(id);
            
            // Record the deletion
            const auditCollection = db._collection('audit');
            auditCollection.save({
                action: 'role_deleted',
                targetId: id,
                targetName: currentRole.name,
                performedBy: req.user._key,
                timestamp: new Date().getTime()
            });
            
            // Prepare response
            const response = {
                success: true,
                message: `Role "${currentRole.name}" successfully deleted`,
                meta: {
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error deleting role ${id}:`, error.message);
            res.throw(500, 'Error deleting role');
        }
    }
};
