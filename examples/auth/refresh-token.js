/**
 * Example refresh token endpoint
 * 
 * This file demonstrates how to create a refresh token endpoint
 * that generates new access tokens from a refresh token.
 */

const joi = require('joi');

module.exports = {
    contentType: 'application/json',
    name: 'Refresh Token',
    
    body: {
        model: joi.object({
            refreshToken: joi.string().required()
        }).required()
    },
    
    handler: (req, res) => {
        const { refreshToken } = req.body;
        const { auth } = module.context;
        
        // Check if refresh tokens are enabled
        if (!auth.useRefreshTokens()) {
            res.throw(400, 'Refresh tokens are not enabled');
        }
        
        try {
            // Refresh the token
            const { accessToken, refreshToken: newRefreshToken } = auth.refreshAccessToken(
                refreshToken, 
                { 
                    rotateRefreshToken: true, // Generate a new refresh token
                    extraData: {
                        refreshedAt: new Date().toISOString()
                    }
                }
            );
            
            // Return the new tokens
            res.json({
                accessToken,
                refreshToken: newRefreshToken
            });
        } catch (error) {
            res.throw(401, `Invalid refresh token: ${error.message}`);
        }
    }
};
