/**
 * Update User Profile Endpoint
 * 
 * Allows users to update their own profile information
 * 
 * @version 1.0.0
 */
const { query, db, time } = require('@arangodb');
const joi = require('joi');
const crypto = require('@arangodb/crypto');

module.exports = {
    contentType: 'application/json',
    name: 'Update User Profile',
    
    // Define request body validation
    body: {
        model: joi.object({
            firstName: joi.string().allow('').optional(),
            lastName: joi.string().allow('').optional(),
            email: joi.string().email().optional(),
            currentPassword: joi.string().when('newPassword', {
                is: joi.exist(),
                then: joi.required(),
                otherwise: joi.optional()
            }),
            newPassword: joi.string().min(8).optional(),
            confirmPassword: joi.string().valid(joi.ref('newPassword')).when('newPassword', {
                is: joi.exist(),
                then: joi.required(),
                otherwise: joi.optional()
            }),
            preferences: joi.object().optional()
        }).required()
    },
    
    // Define possible errors
    error: [
        {'401': 'Authentication required'},
        {'400': 'Invalid profile data'},
        {'403': 'Current password is incorrect'},
        {'404': 'Profile not found'},
        {'409': 'Email already in use'},
        {'500': 'Server error'}
    ],
    
    /**
     * Handle the request to update user profile
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) => {
        const start = time();
        
        // Check if user is authenticated
        if (!req.user || !req.user._key) {
            return res.throw(401, 'Authentication required');
        }
        
        const userId = req.user._key;
        const { 
            firstName, 
            lastName, 
            email, 
            currentPassword, 
            newPassword,
            preferences
        } = req.body;
        
        try {
            // Get current user data
            const [currentUser] = query`
                FOR user IN users
                FILTER user._key == ${userId}
                RETURN user
            `.toArray();
            
            if (!currentUser) {
                return res.throw(404, 'Profile not found');
            }
            
            // Prepare update object
            const update = {};
            
            // Handle basic profile fields
            if (firstName !== undefined) update.firstName = firstName;
            if (lastName !== undefined) update.lastName = lastName;
            if (preferences !== undefined) update.preferences = preferences;
            
            // Handle email update
            if (email !== undefined && email !== currentUser.email) {
                // Check if email is already in use
                const emailExists = query`
                    FOR user IN users
                    FILTER user.email == ${email} AND user._key != ${userId}
                    LIMIT 1
                    RETURN 1
                `.toArray().length > 0;
                
                if (emailExists) {
                    return res.throw(409, 'Email is already in use by another account');
                }
                
                update.email = email;
            }
            
            // Handle password update
            if (newPassword) {
                // Verify current password
                const currentPasswordHash = crypto.sha384(currentPassword);
                if (currentPasswordHash !== currentUser.password) {
                    return res.throw(403, 'Current password is incorrect');
                }
                
                // Update with new password
                update.password = crypto.sha384(newPassword);
            }
            
            // Add modification metadata
            update.updatedAt = new Date().getTime();
            
            // Perform update
            const usersCollection = db._collection('users');
            usersCollection.update(userId, update);
            
            // Record audit log
            const auditCollection = db._collection('audit');
            auditCollection.save({
                action: 'profile_updated',
                targetId: userId,
                timestamp: new Date().getTime(),
                fields: Object.keys(update).filter(k => !['updatedAt', 'password'].includes(k))
            });
            
            // Get updated profile data
            const [updatedProfile] = query`
                LET user = DOCUMENT(users, ${userId})
                
                RETURN {
                    user: UNSET(user, "_id", "_rev", "password"),
                    meta: {
                        message: "Profile updated successfully"
                    }
                }
            `.toArray();
            
            // Add gravatar if email is available
            if (updatedProfile.user.email) {
                updatedProfile.user.gravatar = `https://www.gravatar.com/avatar/${crypto.md5(updatedProfile.user.email)}?d=robohash&s=150`;
            }
            
            // Prepare response
            const response = {
                ...updatedProfile,
                meta: {
                    ...(updatedProfile.meta || {}),
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error updating profile for user ${userId}:`, error.message);
            res.throw(500, 'Error updating profile data');
        }
    }
};
