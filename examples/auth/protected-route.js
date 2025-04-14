/**
 * Example protected route
 * 
 * This file demonstrates how to create a route that requires authentication
 * and uses the user information from the token.
 */

module.exports = {
    contentType: 'application/json',
    name: 'Protected Resource',
    
    handler: (req, res) => {
        // At this point, authentication middleware has already verified the token
        // and attached the user ID to the request object
        
        const { userId, token } = req;
        const { db } = module.context;
        
        // Get user details
        const user = db.get('users', userId, {
            fields: ['_key', 'username', 'email', 'roles']
        });
        
        if (!user) {
            res.throw(404, 'User not found');
        }
        
        // Check if user has required role (example of role-based authorization)
        const requiredRole = 'admin';
        const hasAccess = token.roles && token.roles.includes(requiredRole);
        
        if (!hasAccess) {
            res.throw(403, 'Insufficient permissions');
        }
        
        // Return protected data
        res.json({
            message: 'This is protected data',
            user: {
                username: user.username,
                email: user.email,
                roles: user.roles
            },
            // Add some resource data
            resourceData: {
                id: 'resource-123',
                name: 'Secret Resource',
                description: 'This resource is only visible to authenticated users with the admin role',
                timestamp: new Date().toISOString()
            }
        });
    }
};
