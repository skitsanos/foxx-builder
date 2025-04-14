/**
 * Example login endpoint with JWT token generation
 * 
 * This file demonstrates how to create a login endpoint that
 * generates and returns JWT tokens for authentication.
 */

const joi = require('joi');
const crypto = require('@arangodb/crypto');

module.exports = {
    contentType: 'application/json',
    name: 'Login',
    
    body: {
        model: joi.object({
            username: joi.string().required(),
            password: joi.string().required()
        }).required()
    },
    
    handler: (req, res) => {
        const { username, password } = req.body;
        const { auth, db } = module.context;
        
        // Find user
        const user = db.get('users', username, {
            fields: ['_key', 'username', 'password', 'email', 'roles']
        });
        
        if (!user) {
            res.throw(401, 'Invalid credentials');
        }
        
        // Verify password (assuming SHA384 hashed password)
        const passwordHash = crypto.sha384(password);
        if (user.password !== passwordHash) {
            res.throw(401, 'Invalid credentials');
        }
        
        // Generate access token
        const accessToken = auth.encode({
            userId: user._key,
            username: user.username,
            roles: user.roles || ['user']
        });
        
        const response = {
            accessToken,
            user: {
                _key: user._key,
                username: user.username,
                email: user.email,
                roles: user.roles || ['user']
            }
        };
        
        // Add refresh token if enabled
        if (auth.useRefreshTokens()) {
            response.refreshToken = auth.createRefreshToken(user._key, {
                username: user.username,
                roles: user.roles || ['user']
            });
        }
        
        // Update last login timestamp
        db.update('users', user._key, {
            lastLogin: new Date().toISOString()
        }, {
            returnNew: false
        });
        
        res.json(response);
    }
};
