/**
 * Example of configuration manager usage
 * 
 * This file demonstrates how to use the configuration manager
 * in your Foxx service routes.
 */

module.exports = {
    contentType: 'application/json',
    name: 'Configuration Example',
    
    handler: (req, res) => {
        // Get the configuration manager
        const getConfig = require('../builder/config');
        const config = getConfig(module.context);
        
        // Get individual configuration values
        const jwtSecret = config.get('jwtSecret');
        const sessionTtl = config.getNumber('sessionTtl');
        const useAuth = config.getBoolean('useAuth');
        const authExemptPaths = config.getJSON('authExemptPaths');
        
        // Get configuration groups
        const authConfig = config.getGroup('auth');
        const dbConfig = config.getGroup('database');
        const apiConfig = config.getGroup('api');
        
        // Check if features are enabled
        const tokenExpirationEnabled = config.isEnabled('useTokenExpiration');
        const refreshTokensEnabled = config.isEnabled('useRefreshTokens');
        
        // Get all configuration
        const allConfig = config.getAll();
        
        // Generate configuration documentation
        const docs = config.generateDocs();
        
        // Return everything as response
        res.json({
            individual: {
                jwtSecret: jwtSecret ? '***masked***' : null,
                sessionTtl,
                useAuth,
                authExemptPaths
            },
            groups: {
                auth: {
                    ...authConfig,
                    jwtSecret: authConfig.jwtSecret ? '***masked***' : null
                },
                database: dbConfig,
                api: apiConfig
            },
            features: {
                tokenExpirationEnabled,
                refreshTokensEnabled
            },
            allConfigKeys: Object.keys(allConfig),
            docsPreview: docs.substring(0, 200) + '...' // Just show the beginning
        });
    }
};
