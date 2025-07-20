/**
 * User Registration Endpoint
 * 
 * Creates a new user account with basic information
 * Assigns default user role automatically
 * 
 * @version 2.0.0
 */
const joi = require('joi');
const crypto = require('@arangodb/crypto');
const { db, query } = require('@arangodb');

module.exports = {
    contentType: 'application/json',
    name: 'Signup',

    // Define request body validation
    body: {
        model: joi.object({
            username: joi.string().required().min(3).max(50),
            password: joi.string().required().min(8),
            email: joi.string().email().required(),
            firstName: joi.string().optional(),
            lastName: joi.string().optional(),
            acceptTerms: joi.boolean().valid(true).required()
        }).required()
    },

    error: [
        {'409': 'Already exists'}
    ],

    /**
     * Handle user registration
    * 
    * @param {Object} req - Request object
    * @param {Object} res - Response object
    */
    handler: (req, res) =>
    {
    const { username, password, email, firstName, lastName } = req.body;
    
    try
    {
    // Check if username or email already exists
    const userExists = query`
        FOR user IN users
    FILTER user.username == ${username} OR user.email == ${email}
    LIMIT 1
    RETURN 1
    `.toArray().length > 0;
    
    if (userExists) {
    return res.throw(409, 'Username or email already exists');
    }
    
    // Get default user role
    const [userRole] = query`
        FOR role IN roles
                FILTER role.name == 'user' AND role.isSystem == true
        LIMIT 1
                RETURN role._key
            `.toArray();
            
            if (!userRole) {
                console.warn('Default user role not found');
            }
            
            // Create new user
            const {insert} = module.context;
            const [qr] = insert('users', {
                username,
                email,
                firstName: firstName || '',
                lastName: lastName || '',
                password: crypto.sha384(password),
                roles: userRole ? [userRole] : [],
                status: 'active',
                createdOn: new Date().getTime()
            }).toArray();
            
            // Record signup activity
            try {
                const userActivities = db._collection('userActivities');
                userActivities.insert({
                    userId: qr._key,
                    type: 'signup',
                    timestamp: new Date().getTime(),
                    ipAddress: req.remoteAddress,
                    userAgent: req.headers['user-agent'] || 'unknown'
                });
            } catch (error) {
                console.warn(`Failed to record signup activity: ${error.message}`);
                // Non-critical error, continue with signup process
            }
            
            // Record audit log
            try {
                const auditCollection = db._collection('audit');
                auditCollection.save({
                    action: 'user_created',
                    targetId: qr._key,
                    timestamp: new Date().getTime(),
                    data: {
                        username,
                        email,
                        roles: userRole ? [userRole] : []
                    }
                });
            } catch (error) {
                console.warn(`Failed to record audit log: ${error.message}`);
                // Non-critical error, continue with signup process
            }

            // Get user details without sensitive info
            const [user] = query`
                FOR user IN users
                FILTER user._key == ${qr._key}
                RETURN UNSET(user, "_id", "_rev", "password")
            `.toArray();

            res.status(201).json({ success: true, user });

        } catch (e)
        {
            res.throw(409, 'User already exists');
        }
    }
};