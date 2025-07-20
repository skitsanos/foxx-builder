/**
 * User Login Endpoint
 * 
 * Authenticates users and returns JWT token with user profile
 * Includes roles and permissions information
 * 
 * @version 2.0.0
 * @author skitsanos
 */
const joi = require('joi');
const {query, db, aql} = require('@arangodb');
const crypto = require('@arangodb/crypto');

module.exports = {
    contentType: 'application/json',
    name: 'Login',

    // Define request body validation
    body: {
        model: joi.object({
            username: joi.string().required(),
            password: joi.string().required(),
            rememberMe: joi.boolean().default(false)
        }).required()
    },
    
    // Define possible errors
    error: [
        {'403': 'Invalid credentials'},
        {'400': 'Invalid login data'},
        {'500': 'Authentication error'}
    ],

    /**
     * Handle user login
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) =>
    {
        const {utils, update, auth} = module.context;

        const {username, password, rememberMe = false} = req.body;
        
        try {
            // Find user by username or email
            const [user] = query`
                FOR user IN users
                FILTER (user.username == ${username} OR user.email == ${username})
                    AND user.password == ${crypto.sha384(password)}
                    AND user.status != 'disabled'
                RETURN UNSET(user, "_id", "_rev", "password")
            `.toArray();
            
            if (!user) {
                return res.throw(403, 'Invalid username or password');
            }
            
            // Check if account is locked or requires verification
            if (user.status === 'locked') {
                return res.throw(403, 'Account is locked. Please contact administrator.');
            }
            
            if (user.status === 'pending') {
                return res.throw(403, 'Account requires verification. Please check your email.');
            }
            
            // Get user roles with permissions
            const [rolesData] = query`
                LET userRoleIds = ${user.roles || []}
                
                LET roleDetails = (
                    FOR roleId IN userRoleIds
                    LET role = DOCUMENT(roles, roleId)
                    FILTER role != null
                    RETURN {
                        _key: role._key,
                        name: role.name,
                        description: role.description,
                        permissions: role.permissions || []
                    }
                )
                
                LET effectivePermissions = UNIQUE(
                    FLATTEN(
                        FOR role IN roleDetails
                        RETURN role.permissions || []
                    )
                )
                
                RETURN {
                    roles: roleDetails,
                    permissions: effectivePermissions
                }
            `.toArray();

            //update lastLogin
            update('users', user._key, {lastLogin: new Date().getTime()});
            
            // Record login activity
            try {
                const userActivities = db._collection('userActivities');
                userActivities.insert({
                    userId: user._key,
                    type: 'login',
                    timestamp: new Date().getTime(),
                    ipAddress: req.remoteAddress,
                    userAgent: req.headers['user-agent'] || 'unknown'
                });
            } catch (error) {
                console.warn(`Failed to record login activity: ${error.message}`);
                // Non-critical error, continue with login process
            }

            // Generate token
            const tokenOptions = {
                expiresIn: rememberMe ? '30d' : '24h' // Longer expiration if rememberMe is true
            };
            
            const token = auth.encode({
                userId: user._key,
                roles: user.roles || [],
                permissions: rolesData.permissions || []
            }, tokenOptions);
            
            // Add Gravatar if user has email
            if (user.email && utils.isEmail(user.email)) {
                user.gravatar = `https://www.gravatar.com/avatar/${crypto.md5(user.email)}?d=robohash&s=150`;
            }

            const response = {
                user: {
                    ...user,
                    roles: rolesData.roles || []
                },
                auth: {
                    token,
                    expiresIn: rememberMe ? 2592000 : 86400, // seconds (30 days or 24 hours)
                    permissions: rolesData.permissions || []
                }
            };

            res.json({ result: response });
        } catch (error) {
            console.error('Login error:', error.message);
            res.throw(500, 'Authentication system error');
        }
    }
};