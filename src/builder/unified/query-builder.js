/**
 * Unified Query Builder for ArangoDB Foxx Services
 * 
 * Combines functionality from filter-builder.js and rxq.js into a single robust implementation.
 * Supports both string-based query syntax and structured object-based queries.
 *
 * @version 1.0.0
 * @author skitsanos (original implementations)
 */

const { aql } = require('@arangodb');
const joi = require('joi');
const { extractValue } = require('../parser');
const removeSpecialMarks = require('../remove-special-marks');

// Regular expression for parsing string-based queries
const RX_QUERY_PARSER = /(((?<logic>\w+)\s)?(?<key>\w+))(?<operation>[=~?><])(?<value>"?[^\s]*"?)/gui;

/**
 * Schema for validating structured query objects
 */
const FILTER_SCHEMA = joi.array().items(joi.object({
    key: joi.string().required(),
    operation: joi.string().valid('=', '~', '>', '<', '?', '==', '!=', 'LIKE').default('='),
    value: joi.any().required(),
    logic: joi.string().valid('AND', 'OR', '&&', '||', '').default('')
}));

/**
 * Schema for string-format query validation
 */
const STRING_QUERY_SCHEMA = joi.string();

/**
 * Parse operation symbols to standard format
 * @param {string} op - Operation symbol
 * @returns {string} - Standardized operation
 */
const normalizeOperation = (op) => {
    const operationMap = {
        '=': '==',
        '~': '!=',
        '?': 'LIKE'
    };
    
    return operationMap[op] || op;
};

/**
 * Parse string-based query into structured filter objects
 * @param {string} queryString - Query string to parse
 * @param {string} docVar - Document variable name
 * @returns {Array} - Array of filter objects
 */
const parseStringQuery = (queryString, docVar = 'doc') => {
    try {
        // Decode URI components if present
        const decodedQuery = decodeURIComponent(queryString);
        
        // Extract filter parts using regex
        const filterMatches = [...decodedQuery.matchAll(RX_QUERY_PARSER)];
        
        if (filterMatches.length === 0) {
            return [];
        }
        
        // Transform matches to structured objects
        const filters = filterMatches.map(match => {
            const { logic, key, operation, value } = match.groups;
            
            // Process value based on type
            let processedValue;
            
            // Remove quotes if present
            const cleanValue = value.replace(/^"|"$/g, '');
            
            if (cleanValue.toLowerCase() === 'true') {
                processedValue = true;
            } else if (cleanValue.toLowerCase() === 'false') {
                processedValue = false;
            } else if (cleanValue.length === 0) {
                processedValue = null;
            } else if (!isNaN(cleanValue) && cleanValue.toString().length !== 0) {
                processedValue = Number(cleanValue);
            } else {
                processedValue = cleanValue;
            }
            
            return {
                logic: logic || '',
                key: `${docVar}.${key}`,
                operation: normalizeOperation(operation),
                value: processedValue
            };
        });
        
        // Handle special case for the first filter (no logic needed)
        if (filters.length > 0) {
            filters[0].logic = '';
        }
        
        return filters;
    } catch (error) {
        throw new Error(`Failed to parse query string: ${error.message}`);
    }
};

/**
 * Process array-format queries (legacy filter-builder format)
 * @param {Array} queries - Array of query strings
 * @param {string} docVar - Document variable name
 * @param {Array} textFields - Fields to search in for text queries
 * @returns {Object} - Filter and bind variables
 */
const processLegacyArrayQuery = (queries, docVar = 'doc', textFields = ['name']) => {
    try {
        const filter = [];
        const bindVars = {};

        // Split queries by type
        const queriesWithoutMeta = queries.filter(q => !q.includes(':'));
        const queriesWithMeta = queries.filter(q => q.includes(':'));
        const queriesWithMetaSplit = queriesWithMeta.map(q => q.split(':'));

        // Process inclusion queries
        const queriesThatIncludes = queriesWithoutMeta.filter(q => !q.startsWith('!'));
        for (const item in queriesThatIncludes) {
            const bindVarInclude = `bindVarInclude${item}`;
            const bindVarIncludeValue = `%${queriesThatIncludes[item]}%`;

            for (const textField of textFields) {
                filter.push(`LIKE(${docVar}.${textField}, @${bindVarInclude}, true)`);
            }

            if (item < queriesThatIncludes.length - 1) {
                filter.push('AND');
            }

            bindVars[bindVarInclude] = removeSpecialMarks(bindVarIncludeValue, ['!', '"', '\'']);
        }

        // Process exclusion queries
        const queriesThatExcludes = queriesWithoutMeta.filter(q => q.startsWith('!'));
        for (const item in queriesThatExcludes) {
            const bindVarExclude = `bindVarExclude${item}`;
            const bindVarExcludeValue = `%${queriesThatExcludes[item]}%`;

            if (queriesThatIncludes.length > 0) {
                filter.push('AND');
            }

            for (const textField of textFields) {
                filter.push(`NOT LIKE(${docVar}.${textField}, @${bindVarExclude}, true)`);
            }

            bindVars[bindVarExclude] = bindVarExcludeValue.startsWith('!') 
                ? removeSpecialMarks(bindVarExcludeValue, ['!', '"', '\'']) 
                : bindVarExcludeValue;
        }

        // Process metadata queries
        if (queriesWithMetaSplit.length > 0) {
            if (filter.length > 0) {
                filter.push('AND');
            }

            for (const item in queriesWithMetaSplit) {
                const [meta, value] = queriesWithMetaSplit[item];
                const bindVarMeta = `bindVarMeta${item}`;

                if (value.startsWith('!')) {
                    filter.push(`${docVar}.${meta} != @${bindVarMeta}`);
                } else {
                    filter.push(`${docVar}.${meta} == @${bindVarMeta}`);
                }
                
                if (item < queriesWithMetaSplit.length - 1) {
                    filter.push('AND');
                }

                bindVars[bindVarMeta] = extractValue(removeSpecialMarks(value, ['!', '"', '\'']));
            }
        }

        // Remove leading AND if present
        if (filter.length > 0 && filter[0] === 'AND') {
            filter.shift();
        }

        return { 
            filterString: filter.join(' '), 
            bindVars,
            type: 'legacy'
        };
    } catch (error) {
        throw new Error(`Failed to process legacy array query: ${error.message}`);
    }
};

/**
 * Process structured query objects to AQL filter parts
 * @param {Array} filters - Array of filter objects
 * @returns {Array} - AQL parts
 */
const processStructuredQuery = (filters) => {
    try {
        if (filters.length === 0) {
            return { parts: [aql` `] };
        }

        const parts = [aql` `];

        for (let i = 0; i < filters.length; i++) {
            const { key, value, operation, logic } = filters[i];

            // Add logic operator if needed
            if (i > 0) {
                let logicOperator = '&&'; // Default to AND
                
                if (logic) {
                    if (['OR', '||'].includes(logic)) {
                        logicOperator = '||';
                    }
                }
                
                parts.push(aql.literal(` ${logicOperator} `));
            }

            // Add the filter condition based on operation
            switch (operation) {
                case '!=':
                    parts.push(aql.literal(key));
                    parts.push(aql` != ${value}`);
                    break;

                case '>':
                    parts.push(aql.literal(key));
                    parts.push(aql` > ${value}`);
                    break;

                case '<':
                    parts.push(aql.literal(key));
                    parts.push(aql` < ${value}`);
                    break;

                case 'LIKE':
                    parts.push(aql.literal(`LIKE(${key},`));
                    const opValue = `%${value}%`;
                    parts.push(aql`${opValue}, true)`);
                    break;

                default: // Defaults to equality (==)
                    parts.push(aql.literal(key));
                    parts.push(aql` == ${value}`);
                    break;
            }
        }

        return { 
            parts,
            type: 'structured'
        };
    } catch (error) {
        throw new Error(`Failed to process structured query: ${error.message}`);
    }
};

/**
 * Generate AQL filter from structured query objects
 * @param {Array} filters - Array of filter objects
 * @param {boolean} addFilterKeyword - Whether to add FILTER keyword
 * @returns {Object} - AQL query parts
 */
const generateAqlFromStructured = (filters, addFilterKeyword = true) => {
    const { parts, type } = processStructuredQuery(filters);
    
    // If there are no real conditions, return an empty string
    if (parts.length <= 1) {
        return aql.literal(' ');
    }
    
    // Add FILTER keyword if requested
    if (addFilterKeyword) {
        const fullQuery = [
            aql` FILTER`,
            ...parts
        ];
        
        return aql.join(fullQuery, ' ');
    }
    
    return aql.join(parts, ' ');
};

/**
 * Main query builder function that supports multiple input formats
 * @param {string|Array|Object} query - Query in string format, array format, or structured object format
 * @param {string} docVar - Document variable name
 * @param {Array} textFields - Fields to search for text queries (only used with legacy array format)
 * @param {Object} options - Additional options
 * @returns {Object} - Query object with appropriate format based on input
 */
const buildQuery = (query, docVar = 'doc', textFields = ['name'], options = {}) => {
    try {
        const { addFilterKeyword = true } = options;
        
        // Handle different input types
        if (typeof query === 'string') {
            // Validate string input
            const stringValidation = STRING_QUERY_SCHEMA.validate(query);
            if (stringValidation.error) {
                throw new Error(`Invalid query string: ${stringValidation.error.message}`);
            }
            
            // Parse string query to structured format
            const filters = parseStringQuery(query, docVar);
            
            // Generate AQL
            return generateAqlFromStructured(filters, addFilterKeyword);
        }
        else if (Array.isArray(query)) {
            // Check if this is an array of strings (legacy format) or array of objects (structured format)
            const isLegacyFormat = query.length === 0 || typeof query[0] === 'string';
            
            if (isLegacyFormat) {
                // Legacy array of strings format
                const { filterString, bindVars, type } = processLegacyArrayQuery(query, docVar, textFields);
                
                // If there's no filter, return empty string
                if (!filterString || filterString.length === 0) {
                    return aql.literal(' ');
                }
                
                // Convert to AQL
                if (addFilterKeyword) {
                    return {
                        query: `FILTER ${filterString}`,
                        bindVars,
                        type
                    };
                }
                
                return {
                    query: filterString,
                    bindVars,
                    type
                };
            } else {
                // Array of structured objects format
                // Validate structured input
                const structuredValidation = FILTER_SCHEMA.validate(query);
                if (structuredValidation.error) {
                    throw new Error(`Invalid structured query: ${structuredValidation.error.message}`);
                }
                
                return generateAqlFromStructured(query, addFilterKeyword);
            }
        }
        else {
            throw new Error('Query must be a string, an array of strings, or an array of filter objects');
        }
    } catch (error) {
        // Add more context to the error
        throw new Error(`Query building failed: ${error.message}`);
    }
};

/**
 * Function to be used by rxQuery
 * @param {string} queryString - Query string in rxQuery format
 * @param {string} docVar - Document variable name
 * @returns {Object} - AQL query object
 */
const rxQuery = (queryString, docVar = 'doc') => {
    return buildQuery(queryString, docVar);
};

/**
 * Function to be used by filterBuilder
 * @param {Array} queryArray - Array of query strings
 * @param {string} docVar - Document variable name
 * @param {Array} textFields - Fields to search in
 * @returns {Array} - Filter string and bind variables
 */
const filterBuilderCompat = (queryArray, docVar = 'doc', textFields = ['name']) => {
    const result = buildQuery(queryArray, docVar, textFields, { addFilterKeyword: false });
    
    if (result.type === 'legacy') {
        return [result.query, result.bindVars];
    }
    
    // Should not get here in normal operation, but provided for compatibility
    return [result.toString(), {}];
};

/**
 * Structured format builder
 * @param {Array} filters - Array of structured filter objects
 * @param {string} docVar - Document variable name
 * @returns {Object} - AQL query object
 */
const structuredBuilder = (filters, docVar = 'doc') => {
    // Validate structured input
    const structuredValidation = FILTER_SCHEMA.validate(filters);
    if (structuredValidation.error) {
        throw new Error(`Invalid structured query: ${structuredValidation.error.message}`);
    }
    
    return generateAqlFromStructured(filters);
};

module.exports = {
    buildQuery,
    rxQuery,
    filterBuilder: filterBuilderCompat,
    structuredBuilder,
    // Export helpers for testing and advanced usage
    parseStringQuery,
    processLegacyArrayQuery,
    processStructuredQuery,
    generateAqlFromStructured
};
