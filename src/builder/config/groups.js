/**
 * Configuration Groups
 * 
 * Provides pre-defined configuration groups for common settings
 * 
 * @version 1.0.0
 * @author skitsanos
 */

/**
 * Configuration group definitions
 */
const groups = {
    /**
     * Authentication configuration group
     * 
     * @param {Object} config - Configuration manager
     * @returns {Object} - Authentication configuration
     */
    auth(config) {
        return {
            jwtSecret: config.getString('jwtSecret'),
            sessionTtl: config.getNumber('sessionTtl', 3600),
            useTokenExpiration: config.getBoolean('useTokenExpiration', true),
            useRefreshTokens: config.getBoolean('useRefreshTokens', false),
            refreshTokenTtl: config.getNumber('refreshTokenTtl', 2592000),
            authExemptPaths: config.getJSON('authExemptPaths', ['/', '/login', '/signup'])
        };
    },
    
    /**
     * Database configuration group
     * 
     * @param {Object} config - Configuration manager
     * @returns {Object} - Database configuration
     */
    database(config) {
        return {
            cacheTtl: config.getNumber('dbCacheTtl', 300000), // 5 minutes
            useCache: config.getBoolean('dbUseCache', false),
            maxQuerySize: config.getNumber('dbMaxQuerySize', 1024 * 1024), // 1MB
            transactionTimeout: config.getNumber('dbTransactionTimeout', 60000) // 1 minute
        };
    },
    
    /**
     * Logging configuration group
     * 
     * @param {Object} config - Configuration manager
     * @returns {Object} - Logging configuration
     */
    logging(config) {
        return {
            level: config.getString('logLevel', 'info'),
            includeTimestamp: config.getBoolean('logIncludeTimestamp', true),
            includeComponent: config.getBoolean('logIncludeComponent', true)
        };
    },
    
    /**
     * API configuration group
     * 
     * @param {Object} config - Configuration manager
     * @returns {Object} - API configuration
     */
    api(config) {
        return {
            showExecTime: config.getBoolean('showExecTime', false),
            allowCors: config.getBoolean('allowCors', false),
            corsOrigin: config.getString('corsOrigin', '*'),
            maxRequestSize: config.getNumber('maxRequestSize', 10 * 1024 * 1024) // 10MB
        };
    },
    
    /**
     * Integration configuration group
     * 
     * @param {Object} config - Configuration manager
     * @returns {Object} - Integration configuration
     */
    integration(config) {
        return {
            googleAnalyticsId: config.getString('googleAnalyticsId', ''),
            telegramToken: config.getString('telegramToken', '')
        };
    }
};

module.exports = groups;
