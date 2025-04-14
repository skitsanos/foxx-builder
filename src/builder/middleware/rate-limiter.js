/**
 * Rate Limiting Middleware for Foxx Builder
 * 
 * Tracks and limits API requests based on client identifier (IP or token)
 * 
 * @version 1.0.0
 */
const { db } = require('@arangodb');
const crypto = require('@arangodb/crypto');

/**
 * Rate limiter implementation
 */
const rateLimiter = {
    /**
     * Collection name for storing rate limit data
     */
    collectionName: 'rate_limits',
    
    /**
     * Initialize the rate limiter
     * 
     * Creates required collection and sets up middleware
     * 
     * @param {Object} options - Rate limiting options
     * @returns {Function} - Middleware function
     */
    init(options = {}) {
        // Default configuration
        const config = {
            enabled: true,
            requestsPerMinute: 60,
            windowMs: 60000, // 1 minute in milliseconds
            exemptPaths: ['/status', '/health'],
            exemptRoles: ['admin'],
            ...options
        };
        
        // Ensure collection exists
        this.ensureCollection();
        
        // Return middleware function
        return (req, res, next) => {
            // Skip if rate limiting is disabled
            if (!config.enabled) {
                return next();
            }
            
            // Check for exempt paths
            if (this.isExemptPath(req.path, config.exemptPaths)) {
                return next();
            }
            
            // Check for exempt roles if user is authenticated
            if (req.user && req.user.roles && this.hasExemptRole(req.user.roles, config.exemptRoles)) {
                return next();
            }
            
            // Get client identifier (user ID or IP)
            const clientId = this.getClientIdentifier(req);
            
            // Check if client is rate limited
            const isLimited = this.isRateLimited(clientId, config);
            
            if (isLimited) {
                // Return 429 Too Many Requests
                res.status(429);
                res.json({
                    error: true,
                    message: 'Rate limit exceeded. Please try again later.',
                    code: 429
                });
                return;
            }
            
            // Record this request
            this.recordRequest(clientId);
            
            // Proceed to next middleware
            next();
        };
    },
    
    /**
     * Ensure the rate_limits collection exists
     */
    ensureCollection() {
        if (!db._collection(this.collectionName)) {
            db._createDocumentCollection(this.collectionName);
            
            // Create TTL index to automatically expire records
            db._collection(this.collectionName).ensureIndex({
                type: 'ttl',
                fields: ['expiresAt'],
                expireAfter: 0
            });
        }
    },
    
    /**
     * Check if the request path is exempt from rate limiting
     * 
     * @param {String} path - Request path
     * @param {Array} exemptPaths - List of exempt paths
     * @returns {Boolean} - True if path is exempt
     */
    isExemptPath(path, exemptPaths) {
        return exemptPaths.some(exemptPath => {
            // Support glob pattern with wildcard
            if (exemptPath.includes('*')) {
                const pattern = exemptPath.replace(/\*/g, '.*');
                const regex = new RegExp(`^${pattern}$`);
                return regex.test(path);
            }
            
            // Exact match
            return path === exemptPath;
        });
    },
    
    /**
     * Check if user has an exempt role
     * 
     * @param {Array} userRoles - User roles
     * @param {Array} exemptRoles - Exempt roles
     * @returns {Boolean} - True if user has an exempt role
     */
    hasExemptRole(userRoles, exemptRoles) {
        return userRoles.some(role => exemptRoles.includes(role));
    },
    
    /**
     * Get client identifier from request
     * 
     * Uses user ID if authenticated, otherwise IP address
     * 
     * @param {Object} req - Request object
     * @returns {String} - Client identifier
     */
    getClientIdentifier(req) {
        // Use user ID if authenticated
        if (req.user && req.user._key) {
            return `user:${req.user._key}`;
        }
        
        // Fall back to IP address
        const ip = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.remoteAddress || 
                   '0.0.0.0';
                   
        return `ip:${ip}`;
    },
    
    /**
     * Check if client is rate limited
     * 
     * @param {String} clientId - Client identifier
     * @param {Object} config - Rate limiting configuration
     * @returns {Boolean} - True if client is rate limited
     */
    isRateLimited(clientId, config) {
        const { aql } = require('@arangodb');
        const now = new Date().getTime();
        const windowStart = now - config.windowMs;
        
        // Count requests within window
        const result = db._query(aql`
            FOR doc IN ${db._collection(this.collectionName)}
            FILTER doc.clientId == ${clientId}
               AND doc.timestamp >= ${windowStart}
            COLLECT WITH COUNT INTO count
            RETURN count
        `).toArray();
        
        const count = result[0] || 0;
        
        // Compare count with limit
        return count >= config.requestsPerMinute;
    },
    
    /**
     * Record a request for rate limiting
     * 
     * @param {String} clientId - Client identifier
     */
    recordRequest(clientId) {
        const now = new Date().getTime();
        
        // TTL expiration in 1 hour (ensure records don't accumulate forever)
        const expiresAt = new Date(now + 3600000);
        
        // Insert record
        db._collection(this.collectionName).insert({
            clientId,
            timestamp: now,
            expiresAt
        });
    }
};

module.exports = rateLimiter;
