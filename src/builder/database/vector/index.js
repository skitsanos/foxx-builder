/**
 * Vector Search Operations for ArangoDB
 * 
 * Provides utilities for vector search using cosine similarity,
 * L1 distance, and L2 distance functions introduced in ArangoDB 3.9+
 * 
 * @version 1.0.0
 * @author skitsanos
 */

const { db, aql, query } = require('@arangodb');
const joi = require('joi');

/**
 * Validates collection name and ensures it exists
 * 
 * @param {string} collectionName - Name of the collection
 * @returns {Object} - ArangoDB collection object
 * @throws {Error} - If collection doesn't exist
 */
function validateCollection(collectionName) {
    if (!collectionName || typeof collectionName !== 'string') {
        throw new Error('Collection name must be a non-empty string');
    }

    try {
        const collection = db._collection(collectionName);
        if (!collection) {
            throw new Error(`Collection "${collectionName}" does not exist`);
        }
        return collection;
    } catch (error) {
        throw new Error(`Failed to access collection "${collectionName}": ${error.message}`);
    }
}

/**
 * Validates that the input is a valid vector (array of numbers)
 * 
 * @param {Array} vector - Vector to validate
 * @throws {Error} - If vector is invalid
 */
function validateVector(vector) {
    if (!Array.isArray(vector)) {
        throw new Error('Vector must be an array');
    }
    
    if (vector.length === 0) {
        throw new Error('Vector cannot be empty');
    }
    
    for (const value of vector) {
        if (typeof value !== 'number') {
            throw new Error('Vector must contain only numbers');
        }
    }
}

/**
 * Vector search utilities
 */
const vectorSearch = {
    /**
     * Search for documents by vector similarity using cosine similarity
     * 
     * @param {string} collection - Collection name
     * @param {string} vectorField - Field containing vector in document
     * @param {Array} queryVector - Vector to compare against
     * @param {Object} options - Search options
     * @returns {Array} - Documents sorted by similarity
     */
    cosineSimilarity(collection, vectorField, queryVector, options = {}) {
        try {
            validateCollection(collection);
            validateVector(queryVector);
            
            if (!vectorField || typeof vectorField !== 'string') {
                throw new Error('Vector field name must be a non-empty string');
            }
            
            const { 
                limit = 10, 
                minScore = null,
                includeScore = true,
                returnFields = null,
                filter = null
            } = options;
            
            // Build filter clause if provided
            let filterClause = '';
            let bindVars = { queryVector };
            
            if (filter) {
                if (typeof filter !== 'object') {
                    throw new Error('Filter must be an object');
                }
                
                const filterParts = [];
                Object.entries(filter).forEach(([key, value], index) => {
                    const bindVar = `var${index}`;
                    filterParts.push(`doc.${key} == @${bindVar}`);
                    bindVars[bindVar] = value;
                });
                
                if (filterParts.length > 0) {
                    filterClause = `FILTER ${filterParts.join(' AND ')}`;
                }
            }
            
            // Build min score filter if provided
            let scoreFilter = '';
            if (minScore !== null && typeof minScore === 'number') {
                scoreFilter = `FILTER similarity >= ${minScore}`;
            }
            
            // Build return projection
            let projection;
            if (returnFields) {
                if (!Array.isArray(returnFields)) {
                    throw new Error('returnFields must be an array of field names');
                }
                
                // Always include the score if requested
                if (includeScore) {
                    projection = `RETURN MERGE(KEEP(doc, ${JSON.stringify(returnFields)}), { score: similarity })`;
                } else {
                    projection = `RETURN KEEP(doc, ${JSON.stringify(returnFields)})`;
                }
            } else {
                if (includeScore) {
                    projection = `RETURN MERGE(doc, { score: similarity })`;
                } else {
                    projection = `RETURN doc`;
                }
            }
            
            // Build the complete query
            const aqlQuery = `
                FOR doc IN ${collection}
                ${filterClause}
                LET similarity = COSINE_SIMILARITY(doc.${vectorField}, @queryVector)
                ${scoreFilter}
                SORT similarity DESC
                LIMIT ${limit}
                ${projection}
            `;
            
            // Execute the query
            return db._query(aqlQuery, bindVars).toArray();
        } catch (error) {
            throw new Error(`Vector search failed: ${error.message}`);
        }
    },
    
    /**
     * Search for documents by vector similarity using L2 distance (Euclidean distance)
     * 
     * @param {string} collection - Collection name
     * @param {string} vectorField - Field containing vector in document
     * @param {Array} queryVector - Vector to compare against
     * @param {Object} options - Search options
     * @returns {Array} - Documents sorted by distance (ascending)
     */
    l2Distance(collection, vectorField, queryVector, options = {}) {
        try {
            validateCollection(collection);
            validateVector(queryVector);
            
            if (!vectorField || typeof vectorField !== 'string') {
                throw new Error('Vector field name must be a non-empty string');
            }
            
            const { 
                limit = 10, 
                maxDistance = null,
                includeDistance = true,
                returnFields = null,
                filter = null
            } = options;
            
            // Build filter clause if provided
            let filterClause = '';
            let bindVars = { queryVector };
            
            if (filter) {
                if (typeof filter !== 'object') {
                    throw new Error('Filter must be an object');
                }
                
                const filterParts = [];
                Object.entries(filter).forEach(([key, value], index) => {
                    const bindVar = `var${index}`;
                    filterParts.push(`doc.${key} == @${bindVar}`);
                    bindVars[bindVar] = value;
                });
                
                if (filterParts.length > 0) {
                    filterClause = `FILTER ${filterParts.join(' AND ')}`;
                }
            }
            
            // Build max distance filter if provided
            let distanceFilter = '';
            if (maxDistance !== null && typeof maxDistance === 'number') {
                distanceFilter = `FILTER distance <= ${maxDistance}`;
            }
            
            // Build return projection
            let projection;
            if (returnFields) {
                if (!Array.isArray(returnFields)) {
                    throw new Error('returnFields must be an array of field names');
                }
                
                // Always include the distance if requested
                if (includeDistance) {
                    projection = `RETURN MERGE(KEEP(doc, ${JSON.stringify(returnFields)}), { distance })`;
                } else {
                    projection = `RETURN KEEP(doc, ${JSON.stringify(returnFields)})`;
                }
            } else {
                if (includeDistance) {
                    projection = `RETURN MERGE(doc, { distance })`;
                } else {
                    projection = `RETURN doc`;
                }
            }
            
            // Build the complete query
            const aqlQuery = `
                FOR doc IN ${collection}
                ${filterClause}
                LET distance = L2_DISTANCE(doc.${vectorField}, @queryVector)
                ${distanceFilter}
                SORT distance ASC
                LIMIT ${limit}
                ${projection}
            `;
            
            // Execute the query
            return db._query(aqlQuery, bindVars).toArray();
        } catch (error) {
            throw new Error(`Vector search failed: ${error.message}`);
        }
    },
    
    /**
     * Search for documents by vector similarity using L1 distance (Manhattan distance)
     * 
     * @param {string} collection - Collection name
     * @param {string} vectorField - Field containing vector in document
     * @param {Array} queryVector - Vector to compare against
     * @param {Object} options - Search options
     * @returns {Array} - Documents sorted by distance (ascending)
     */
    l1Distance(collection, vectorField, queryVector, options = {}) {
        try {
            validateCollection(collection);
            validateVector(queryVector);
            
            if (!vectorField || typeof vectorField !== 'string') {
                throw new Error('Vector field name must be a non-empty string');
            }
            
            const { 
                limit = 10, 
                maxDistance = null,
                includeDistance = true,
                returnFields = null,
                filter = null
            } = options;
            
            // Build filter clause if provided
            let filterClause = '';
            let bindVars = { queryVector };
            
            if (filter) {
                if (typeof filter !== 'object') {
                    throw new Error('Filter must be an object');
                }
                
                const filterParts = [];
                Object.entries(filter).forEach(([key, value], index) => {
                    const bindVar = `var${index}`;
                    filterParts.push(`doc.${key} == @${bindVar}`);
                    bindVars[bindVar] = value;
                });
                
                if (filterParts.length > 0) {
                    filterClause = `FILTER ${filterParts.join(' AND ')}`;
                }
            }
            
            // Build max distance filter if provided
            let distanceFilter = '';
            if (maxDistance !== null && typeof maxDistance === 'number') {
                distanceFilter = `FILTER distance <= ${maxDistance}`;
            }
            
            // Build return projection
            let projection;
            if (returnFields) {
                if (!Array.isArray(returnFields)) {
                    throw new Error('returnFields must be an array of field names');
                }
                
                // Always include the distance if requested
                if (includeDistance) {
                    projection = `RETURN MERGE(KEEP(doc, ${JSON.stringify(returnFields)}), { distance })`;
                } else {
                    projection = `RETURN KEEP(doc, ${JSON.stringify(returnFields)})`;
                }
            } else {
                if (includeDistance) {
                    projection = `RETURN MERGE(doc, { distance })`;
                } else {
                    projection = `RETURN doc`;
                }
            }
            
            // Build the complete query
            const aqlQuery = `
                FOR doc IN ${collection}
                ${filterClause}
                LET distance = L1_DISTANCE(doc.${vectorField}, @queryVector)
                ${distanceFilter}
                SORT distance ASC
                LIMIT ${limit}
                ${projection}
            `;
            
            // Execute the query
            return db._query(aqlQuery, bindVars).toArray();
        } catch (error) {
            throw new Error(`Vector search failed: ${error.message}`);
        }
    },
    
    /**
     * Create a vector embedding from text using external API
     * 
     * This is a placeholder method - in a real implementation,
     * you would call an external embedding API like OpenAI or
     * use a local embedding model.
     * 
     * @param {string} text - Text to convert to vector
     * @returns {Promise<Array>} - Vector representation
     */
    async createEmbedding(text) {
        // This is just a placeholder - in a real implementation,
        // you would call an embedding API or use a local model
        
        throw new Error('createEmbedding is not implemented. You need to integrate with an embedding service.');
        
        /* Example implementation with OpenAI:
        
        const { openai } = require('@arangodb/openai'); // Hypothetical module
        
        const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: text
        });
        
        return response.data[0].embedding;
        */
    },
    
    /**
     * Store a vector embedding in the database
     * 
     * @param {string} collection - Collection name
     * @param {Object} document - Document to store
     * @param {string} textField - Field containing text to embed
     * @param {string} vectorField - Field to store vector in
     * @returns {Object} - Stored document
     */
    async storeEmbedding(collection, document, textField, vectorField) {
        try {
            validateCollection(collection);
            
            if (!document || typeof document !== 'object') {
                throw new Error('Document must be a non-empty object');
            }
            
            if (!textField || typeof textField !== 'string') {
                throw new Error('Text field name must be a non-empty string');
            }
            
            if (!vectorField || typeof vectorField !== 'string') {
                throw new Error('Vector field name must be a non-empty string');
            }
            
            if (!document[textField]) {
                throw new Error(`Document does not contain text field "${textField}"`);
            }
            
            // Generate embedding for the text
            const embedding = await this.createEmbedding(document[textField]);
            
            // Add the embedding to the document
            const documentWithEmbedding = {
                ...document,
                [vectorField]: embedding
            };
            
            // Store the document
            const queryObj = query`
                INSERT ${documentWithEmbedding} 
                INTO ${db._collection(collection)} 
                RETURN NEW
            `;
            
            const results = queryObj.toArray();
            return results[0];
        } catch (error) {
            throw new Error(`Failed to store embedding: ${error.message}`);
        }
    }
};

module.exports = vectorSearch;
