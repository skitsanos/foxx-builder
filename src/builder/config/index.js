/**
 * Configuration Manager for Foxx Builder
 * 
 * Provides a centralized way to access and validate configuration
 * based on the schema defined in manifest.json
 * 
 * @version 1.0.0
 * @author skitsanos
 */

const joi = require('joi');
const groups = require('./groups');

// Configuration cache
let configCache = null;
let schemaCache = null;

/**
 * Configuration Manager
 */
class ConfigManager {
    /**
     * Create a new ConfigManager
     * 
     * @param {Object} context - Module context containing raw configuration
     */
    constructor(context) {
        this.context = context;
        this.rawConfig = context.configuration || {};
    }
    
    /**
     * Initialize configuration with validation
     * 
     * @returns {Object} - Validated configuration
     */
    initialize() {
        try {
            // Build schema based on manifest configuration
            const schema = this._buildSchema();
            schemaCache = schema;
            
            // Validate configuration against schema
            const { value, error } = schema.validate(this.rawConfig, {
                abortEarly: false,
                allowUnknown: true
            });
            
            if (error) {
                console.error('Configuration validation failed:');
                for (const detail of error.details) {
                    console.error(`- ${detail.message}`);
                }
                throw new Error('Configuration validation failed');
            }
            
            // Cache validated configuration
            configCache = value;
            
            return value;
        } catch (error) {
            console.error(`Failed to initialize configuration: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Build a Joi schema from manifest configuration
     * 
     * @returns {Object} - Joi schema
     */
    _buildSchema() {
        try {
            const manifest = this.context.manifest;
            const configDefs = manifest.configuration || {};
            
            // Build schema object
            const schemaObj = {};
            
            for (const [key, def] of Object.entries(configDefs)) {
                let validator;
                
                // Determine validator based on type
                switch (def.type) {
                    case 'string':
                        validator = joi.string();
                        break;
                    case 'integer':
                        validator = joi.number().integer();
                        break;
                    case 'number':
                        validator = joi.number();
                        break;
                    case 'boolean':
                        validator = joi.boolean();
                        break;
                    case 'json':
                        validator = joi.any(); // JSON can be any type
                        break;
                    default:
                        validator = joi.any();
                }
                
                // Add default if defined
                if (def.default !== undefined) {
                    validator = validator.default(def.default);
                }
                
                // Add description if defined
                if (def.description) {
                    validator = validator.description(def.description);
                }
                
                // Add to schema
                schemaObj[key] = validator;
            }
            
            return joi.object(schemaObj);
        } catch (error) {
            console.error(`Failed to build configuration schema: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get a configuration value by key
     * 
     * @param {string} key - Configuration key
     * @param {any} defaultValue - Default value if not found
     * @returns {any} - Configuration value
     */
    get(key, defaultValue) {
        if (!configCache) {
            this.initialize();
        }
        
        const value = configCache[key];
        
        return value !== undefined ? value : defaultValue;
    }
    
    /**
     * Get a configuration value as a string
     * 
     * @param {string} key - Configuration key
     * @param {string} defaultValue - Default value if not found
     * @returns {string} - Configuration value as string
     */
    getString(key, defaultValue = '') {
        const value = this.get(key, defaultValue);
        return String(value);
    }
    
    /**
     * Get a configuration value as a number
     * 
     * @param {string} key - Configuration key
     * @param {number} defaultValue - Default value if not found
     * @returns {number} - Configuration value as number
     */
    getNumber(key, defaultValue = 0) {
        const value = this.get(key, defaultValue);
        
        if (typeof value === 'number') {
            return value;
        }
        
        const parsed = Number(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }
    
    /**
     * Get a configuration value as a boolean
     * 
     * @param {string} key - Configuration key
     * @param {boolean} defaultValue - Default value if not found
     * @returns {boolean} - Configuration value as boolean
     */
    getBoolean(key, defaultValue = false) {
        const value = this.get(key, defaultValue);
        
        if (typeof value === 'boolean') {
            return value;
        }
        
        if (typeof value === 'string') {
            return value.toLowerCase() === 'true';
        }
        
        return Boolean(value);
    }
    
    /**
     * Get a configuration value as a JSON object
     * 
     * @param {string} key - Configuration key
     * @param {Object} defaultValue - Default value if not found
     * @returns {Object} - Configuration value as object
     */
    getJSON(key, defaultValue = {}) {
        const value = this.get(key, defaultValue);
        
        if (typeof value === 'object') {
            return value;
        }
        
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch (error) {
                console.error(`Failed to parse JSON configuration for key ${key}: ${error.message}`);
                return defaultValue;
            }
        }
        
        return defaultValue;
    }
    
    /**
     * Get a section of configuration
     * 
     * @param {string} prefix - Section prefix
     * @returns {Object} - Section configuration
     */
    getSection(prefix) {
        if (!configCache) {
            this.initialize();
        }
        
        const section = {};
        
        for (const [key, value] of Object.entries(configCache)) {
            if (key.startsWith(`${prefix}.`) || key === prefix) {
                if (key === prefix) {
                    return value;
                }
                
                const subKey = key.substring(prefix.length + 1);
                section[subKey] = value;
            }
        }
        
        return section;
    }
    
    /**
     * Get a predefined configuration group
     * 
     * @param {string} groupName - Group name
     * @returns {Object} - Group configuration
     */
    getGroup(groupName) {
        if (!groups[groupName]) {
            console.warn(`Configuration group "${groupName}" not found`);
            return {};
        }
        
        return groups[groupName](this);
    }
    
    /**
     * Check if a feature is enabled
     * 
     * @param {string} feature - Feature key
     * @returns {boolean} - True if enabled
     */
    isEnabled(feature) {
        return this.getBoolean(feature, false);
    }
    
    /**
     * Get all configuration
     * 
     * @returns {Object} - All configuration
     */
    getAll() {
        if (!configCache) {
            this.initialize();
        }
        
        return { ...configCache };
    }
    
    /**
     * Generate documentation for configuration
     * 
     * @returns {string} - Markdown documentation
     */
    generateDocs() {
        if (!schemaCache) {
            this._buildSchema();
        }
        
        const manifest = this.context.manifest;
        const configDefs = manifest.configuration || {};
        
        let docs = '# Configuration Options\n\n';
        
        for (const [key, def] of Object.entries(configDefs)) {
            docs += `## ${key}\n\n`;
            
            if (def.description) {
                docs += `${def.description}\n\n`;
            }
            
            docs += `- **Type**: ${def.type}\n`;
            
            if (def.default !== undefined) {
                docs += `- **Default**: \`${JSON.stringify(def.default)}\`\n`;
            }
            
            docs += '\n';
        }
        
        return docs;
    }
}

let instance = null;

/**
 * Get configuration instance
 * 
 * @param {Object} context - Module context
 * @returns {ConfigManager} - Configuration manager instance
 */
function getConfig(context) {
    if (!instance && context) {
        instance = new ConfigManager(context);
        instance.initialize();
    }
    
    if (!instance) {
        throw new Error('Configuration manager not initialized');
    }
    
    return instance;
}

module.exports = getConfig;
