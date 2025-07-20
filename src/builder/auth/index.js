/**
 * Enhanced JWT Authentication for Foxx Services
 * 
 * Provides robust JWT token handling with comprehensive validation
 * 
 * @version 1.1.0
 * @author skitsanos
 */
const crypto = require('@arangodb/crypto');
const joi = require('joi');

// Schema for token payload validation
const tokenPayloadSchema = joi.object({
    // Standard JWT claims
    iss: joi.string().optional().description('Token issuer'),
    sub: joi.string().optional().description('Subject (typically user ID)'),
    aud: joi.string().optional().description('Audience'),
    exp: joi.number().optional().description('Expiration time (Unix timestamp)'),
    nbf: joi.number().optional().description('Not before time (Unix timestamp)'),
    iat: joi.number().optional().description('Issued at time (Unix timestamp)'),
    jti: joi.string().optional().description('JWT ID'),
    
    // Custom claims
    userId: joi.string().required().description('User ID in the system'),
    roles: joi.array().items(joi.string()).optional().description('User roles'),
    permissions: joi.array().items(joi.string()).optional().description('User permissions'),
    expiresOn: joi.number().optional().description('Expiration timestamp (ms)'),
    type: joi.string().valid('access', 'refresh').default('access').description('Token type')
}).unknown(true);

/**
 * Authentication service
 */
class AuthService {
    /**
     * Creates a new AuthService instance
     * 
     * @param {Object} context - Module context with configuration
     */
    constructor(context) {
        this.context = context;
        
        // Default values
        this.defaultTtl = 3600; // 1 hour in seconds
        this.defaultRefreshTtl = 2592000; // 30 days in seconds
        this.algorithm = 'HS512';
        this.issuer = 'foxx-builder';
        this.audience = 'foxx-api';
    }
    
    /**
     * Get the JWT secret from configuration
     * 
     * @returns {string} JWT secret
     * @throws {Error} If JWT secret is not configured
     */
    getJwtSecret() {
        const { jwtSecret } = this.context.configuration;
        
        if (!jwtSecret) {
            throw new Error('JWT secret is missing in configuration');
        }
        
        return jwtSecret;
    }
    
    /**
     * Get the session TTL from configuration
     * 
     * @returns {number} Session TTL in seconds
     */
    getSessionTtl() {
        const { sessionTtl } = this.context.configuration;
        return sessionTtl || this.defaultTtl;
    }
    
    /**
     * Get the refresh token TTL from configuration
     * 
     * @returns {number} Refresh token TTL in seconds
     */
    getRefreshTokenTtl() {
        const { refreshTokenTtl } = this.context.configuration;
        return refreshTokenTtl || this.defaultRefreshTtl;
    }
    
    /**
     * Check if token expiration is enabled
     * 
     * @returns {boolean} True if token expiration is enabled
     */
    useTokenExpiration() {
        const { useTokenExpiration } = this.context.configuration;
        return useTokenExpiration !== false; // Default to true if not specified
    }
    
    /**
     * Check if refresh tokens are enabled
     * 
     * @returns {boolean} True if refresh tokens are enabled
     */
    useRefreshTokens() {
        const { useRefreshTokens } = this.context.configuration;
        return useRefreshTokens === true; // Default to false if not specified
    }
    
    /**
     * Encode a payload into a JWT token
     * 
     * @param {Object} payload - Payload to encode
     * @param {Object} options - Additional options
     * @returns {string} JWT token
     * @throws {Error} If encoding fails
     */
    encode(payload, options = {}) {
        try {
            if (!payload) {
                throw new Error('Payload cannot be empty');
            }
            
            const jwtSecret = this.getJwtSecret();
            const sessionTtl = this.getSessionTtl();
            const useExpiration = options.useExpiration !== undefined 
                ? options.useExpiration 
                : this.useTokenExpiration();
            
            // Current timestamp in seconds (JWT standard)
            const now = Math.floor(Date.now() / 1000);
            
            // Prepare standard JWT claims
            const tokenPayload = {
                // Standard claims
                iss: options.issuer || this.issuer,
                aud: options.audience || this.audience,
                iat: now,
                nbf: now,
                jti: crypto.uuidv4(),
                
                // Custom claims
                ...payload,
                type: options.type || 'access'
            };
            
            // Add expiration if enabled
            if (useExpiration) {
                // Add standard exp claim (in seconds)
                tokenPayload.exp = now + sessionTtl;
                
                // Add expiresOn (in milliseconds) for backward compatibility
                tokenPayload.expiresOn = Date.now() + (sessionTtl * 1000);
            }
            
            // Validate payload structure
            const { error } = tokenPayloadSchema.validate(tokenPayload);
            if (error) {
                throw new Error(`Invalid token payload: ${error.message}`);
            }
            
            // Convert to JSON string
            const jsonPayload = JSON.stringify(tokenPayload);
            
            // Encode the token
            return crypto.jwtEncode(jwtSecret, jsonPayload, this.algorithm);
        } catch (error) {
            throw new Error(`Token encoding failed: ${error.message}`);
        }
    }
    
    /**
     * Create a refresh token for a user
     * 
     * @param {string} userId - User ID
     * @param {Object} extraData - Additional data to include in the token
     * @returns {string} Refresh token
     */
    createRefreshToken(userId, extraData = {}) {
        if (!this.useRefreshTokens()) {
            throw new Error('Refresh tokens are not enabled in configuration');
        }
        
        const refreshTokenTtl = this.getRefreshTokenTtl();
        
        return this.encode({
            userId,
            ...extraData,
            type: 'refresh'
        }, {
            useExpiration: true,
            type: 'refresh',
            sessionTtl: refreshTokenTtl
        });
    }
    
    /**
     * Decode and validate a JWT token
     * 
     * @param {string} token - JWT token to decode
     * @param {Object} options - Additional options for validation
     * @returns {Object} Decoded payload
     * @throws {Error} If decoding or validation fails
     */
    decode(token, options = {}) {
        try {
            if (!token) {
                throw new Error('Token cannot be empty');
            }
            
            const jwtSecret = this.getJwtSecret();
            
            // Verify the token signature and decode
            const payloadJson = crypto.jwtDecode(jwtSecret, token, true);
            
            // Parse the payload
            const payload = JSON.parse(payloadJson);
            
            // Validate payload structure
            const { error } = tokenPayloadSchema.validate(payload, { allowUnknown: true });
            if (error) {
                throw new Error(`Invalid token payload: ${error.message}`);
            }
            
            // Skip expiration check if token expiration is disabled or if skipExpirationCheck is true
            const checkExpiration = this.useTokenExpiration() && !options.skipExpirationCheck;
            
            if (checkExpiration && this.isExpired(payload)) {
                throw new Error('Token has expired');
            }
            
            // Verify not before
            if (payload.nbf && Math.floor(Date.now() / 1000) < payload.nbf) {
                throw new Error('Token is not yet valid');
            }
            
            // Verify token type if specified
            if (options.type && payload.type !== options.type) {
                throw new Error(`Invalid token type: expected ${options.type} but got ${payload.type}`);
            }
            
            // Verify issuer if required
            if (options.verifyIssuer && options.issuer && payload.iss !== options.issuer) {
                throw new Error('Token issuer is invalid');
            }
            
            // Verify audience if required
            if (options.verifyAudience && options.audience && payload.aud !== options.audience) {
                throw new Error('Token audience is invalid');
            }
            
            return payload;
        } catch (error) {
            throw new Error(`Token validation failed: ${error.message}`);
        }
    }
    
    /**
     * Check if a token or payload has expired
     * 
     * @param {string|Object} tokenOrPayload - JWT token or decoded payload
     * @returns {boolean} True if the token has expired
     */
    isExpired(tokenOrPayload) {
        // If token expiration is disabled, tokens never expire
        if (!this.useTokenExpiration()) {
            return false;
        }
        
        try {
            let payload;
            
            if (typeof tokenOrPayload === 'string') {
                const jwtSecret = this.getJwtSecret();
                const payloadJson = crypto.jwtDecode(jwtSecret, tokenOrPayload, false);
                payload = JSON.parse(payloadJson);
            } else {
                payload = tokenOrPayload;
            }
            
            // Check standard exp claim (in seconds)
            if (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp) {
                return true;
            }
            
            // Check custom expiresOn property (in milliseconds) for backward compatibility
            if (payload.expiresOn && Date.now() >= payload.expiresOn) {
                return true;
            }
            
            return false;
        } catch (error) {
            // If we can't decode the token, consider it expired
            return true;
        }
    }
    
    /**
     * Validate a token and return the user ID
     * 
     * @param {string} token - JWT token to validate
     * @param {Object} options - Validation options
     * @returns {string} User ID from the token
     * @throws {Error} If validation fails
     */
    validateToken(token, options = {}) {
        const payload = this.decode(token, options);
        
        if (!payload.userId) {
            throw new Error('Token does not contain a user ID');
        }
        
        return payload.userId;
    }
    
    /**
     * Refresh an access token using a refresh token
     * 
     * @param {string} refreshToken - Refresh token
     * @param {Object} options - Additional options
     * @returns {Object} New access token and optionally a new refresh token
     * @throws {Error} If refresh fails
     */
    refreshAccessToken(refreshToken, options = {}) {
        if (!this.useRefreshTokens()) {
            throw new Error('Refresh tokens are not enabled in configuration');
        }
        
        try {
            // Validate the refresh token
            const payload = this.decode(refreshToken, { 
                type: 'refresh',
                ...options
            });
            
            // Extract user data from the refresh token
            const { userId, roles, permissions } = payload;
            
            // Create a new access token
            const accessToken = this.encode({
                userId,
                roles,
                permissions,
                ...options.extraData || {}
            });
            
            const result = { accessToken };
            
            // Optionally create a new refresh token
            if (options.rotateRefreshToken) {
                result.refreshToken = this.createRefreshToken(userId, {
                    roles,
                    permissions,
                    ...options.extraData || {}
                });
            }
            
            return result;
        } catch (error) {
            throw new Error(`Failed to refresh token: ${error.message}`);
        }
    }
    
    /**
     * Create middleware for JWT authentication
     * 
     * @param {Object} options - Configuration options
     * @returns {Function} Express middleware function
     */
    createMiddleware(options = {}) {
        const {
            exempt = ['/', '/login', '/signup'],
            tokenExtractor = this.defaultTokenExtractor.bind(this),
            onSuccess,
            onError,
            tokenType = 'access'
        } = options;
        
        return (req, res, next) => {
            try {
                // Check if the path is exempt from authentication
                if (this.isExemptPath(req.path, exempt)) {
                    return next();
                }
                
                // Extract token from request
                const token = tokenExtractor(req);
                if (!token) {
                    return this.handleAuthError(res, 'Missing authentication token', 401, onError);
                }
                
                // Validate token
                let userId;
                try {
                    userId = this.validateToken(token, { type: tokenType });
                } catch (error) {
                    return this.handleAuthError(res, error.message, 403, onError);
                }
                
                // Attach user ID to request
                req.userId = userId;
                
                // Attach decoded token to request
                req.token = this.decode(token);
                
                // Call optional success handler
                if (onSuccess) {
                    onSuccess(req, res);
                }
                
                next();
            } catch (error) {
                this.handleAuthError(res, `Authentication error: ${error.message}`, 500, onError);
            }
        };
    }
    
    /**
     * Default token extractor function
     * 
     * @param {Object} req - Request object
     * @returns {string|null} Extracted token or null
     */
    defaultTokenExtractor(req) {
        // Try Authorization header (Bearer token)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        
        // Try auth object (ArangoDB specific)
        const { auth } = req;
        if (auth && auth.bearer) {
            return auth.bearer;
        }
        
        // Try query parameter
        if (req.queryParams && req.queryParams.token) {
            return req.queryParams.token;
        }
        
        return null;
    }
    
    /**
     * Check if a path is exempt from authentication
     * 
     * @param {string} path - Request path
     * @param {Array|Function} exempt - Exempt paths or function
     * @returns {boolean} True if the path is exempt
     */
    isExemptPath(path, exempt) {
        if (typeof exempt === 'function') {
            return exempt(path);
        }
        
        if (Array.isArray(exempt)) {
            // Exact match
            if (exempt.includes(path)) {
                return true;
            }
            
            // Regular expression match
            for (const pattern of exempt) {
                if (typeof pattern === 'string' && pattern.includes('*')) {
                    const regexPattern = pattern
                        .replace(/\*/g, '.*')
                        .replace(/\//g, '\\/');
                    const regex = new RegExp(`^${regexPattern}$`, 'i');
                    if (regex.test(path)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * Handle authentication errors
     * 
     * @param {Object} res - Response object
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {Function} onError - Optional error handler
     */
    handleAuthError(res, message, statusCode = 401, onError) {
        if (onError) {
            return onError(res, message, statusCode);
        }
        
        res.throw(statusCode, message);
    }
}

module.exports = (context) => new AuthService(context);
