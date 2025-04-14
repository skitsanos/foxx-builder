/**
 * Configuration Schema Helper
 * 
 * Provides utilities for working with configuration schemas
 * 
 * @version 1.0.0
 * @author skitsanos
 */

const joi = require('joi');

/**
 * Schema helper for configuration
 */
const schema = {
    /**
     * Build a Joi schema from configuration definitions
     * 
     * @param {Object} configDefs - Configuration definitions
     * @returns {Object} - Joi schema
     */
    buildSchema(configDefs) {
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
    },
    
    /**
     * Validate configuration against schema
     * 
     * @param {Object} config - Configuration to validate
     * @param {Object} schema - Joi schema
     * @returns {Object} - Validation result
     */
    validate(config, schema) {
        return schema.validate(config, {
            abortEarly: false,
            allowUnknown: true
        });
    },
    
    /**
     * Generate documentation from schema
     * 
     * @param {Object} configDefs - Configuration definitions
     * @returns {string} - Markdown documentation
     */
    generateDocs(configDefs) {
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
};

module.exports = schema;
