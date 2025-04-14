/**
 * Enhanced Database Operations for Foxx Services
 * 
 * Provides robust database operations with transaction support,
 * batching, error handling, and caching.
 * 
 * @version 1.1.0
 * @author skitsanos
 */

const { db, query, aql } = require('@arangodb');
const joi = require('joi');

// Import vector search operations
const vectorSearch = require('./vector');

// Simple in-memory cache
const queryCache = new Map();

/**
 * Default cache TTL in milliseconds (5 minutes)
 * @type {number}
 */
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

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
 * Validates document ID
 * 
 * @param {string} docId - Document ID to validate
 * @throws {Error} - If ID is invalid
 */
function validateDocId(docId) {
    if (!docId || typeof docId !== 'string') {
        throw new Error('Document ID must be a non-empty string');
    }
}

/**
 * Generate a cache key for a query
 * 
 * @param {string} operation - Operation type
 * @param {string} collection - Collection name
 * @param {string|Object} params - Query parameters
 * @returns {string} - Cache key
 */
function generateCacheKey(operation, collection, params) {
    return `${operation}:${collection}:${JSON.stringify(params)}`;
}

/**
 * Clears cache entries for a collection
 * 
 * @param {string} collection - Collection name
 */
function clearCollectionCache(collection) {
    const keysToDelete = [];
    
    for (const key of queryCache.keys()) {
        if (key.includes(`:${collection}:`)) {
            keysToDelete.push(key);
        }
    }
    
    for (const key of keysToDelete) {
        queryCache.delete(key);
    }
}

/**
 * Execute query with caching
 * 
 * @param {Object} queryObj - AQL query object
 * @param {string} cacheKey - Cache key
 * @param {Object} options - Options for caching
 * @returns {Array} - Query results
 */
function executeQuery(queryObj, cacheKey = null, options = {}) {
    const { useCache = false, cacheTtl = DEFAULT_CACHE_TTL } = options;
    
    // Check cache first if enabled
    if (useCache && cacheKey && queryCache.has(cacheKey)) {
        const cached = queryCache.get(cacheKey);
        if (cached.expires > Date.now()) {
            return cached.data;
        } else {
            queryCache.delete(cacheKey);
        }
    }
    
    // Execute the query
    try {
        const result = queryObj.toArray();
        
        // Store in cache if enabled
        if (useCache && cacheKey) {
            queryCache.set(cacheKey, {
                data: result,
                expires: Date.now() + cacheTtl
            });
        }
        
        return result;
    } catch (error) {
        throw new Error(`Query execution failed: ${error.message}`);
    }
}

/**
 * Database operations module
 */
const database = {
    /**
     * Vector search operations
     */
    vector: vectorSearch,
    
    /**
     * Get document by ID
     * 
     * @param {string} collection - Collection name
     * @param {string} docId - Document ID
     * @param {Object} options - Query options
     * @returns {Object|null} - Document or null if not found
     */
    get(collection, docId, options = {}) {
        try {
            validateCollection(collection);
            validateDocId(docId);
            
            const { fields = [], useCache = false, cacheTtl = DEFAULT_CACHE_TTL } = options;
            
            const cacheKey = useCache 
                ? generateCacheKey('get', collection, { docId, fields }) 
                : null;
            
            let queryObj;
            
            if (fields && fields.length > 0) {
                // Return only specified fields
                queryObj = query`
                    LET doc = DOCUMENT(${db._collection(collection)}, ${docId})
                    RETURN doc ? KEEP(doc, ${fields}) : null
                `;
            } else {
                // Return full document without system fields
                queryObj = query`
                    LET doc = DOCUMENT(${db._collection(collection)}, ${docId})
                    RETURN doc ? UNSET(doc, "_id", "_rev") : null
                `;
            }
            
            const results = executeQuery(queryObj, cacheKey, { useCache, cacheTtl });
            return results[0] || null;
        } catch (error) {
            throw new Error(`Failed to get document: ${error.message}`);
        }
    },
    
    /**
     * Find documents by query
     * 
     * @param {string} collection - Collection name
     * @param {Object} queryParams - Query parameters
     * @param {Object} options - Query options
     * @returns {Array} - Matching documents
     */
    find(collection, queryParams = {}, options = {}) {
        try {
            validateCollection(collection);
            
            const { 
                skip = 0, 
                limit = 100,
                sort = null,
                fields = [],
                useCache = false, 
                cacheTtl = DEFAULT_CACHE_TTL 
            } = options;
            
            const cacheKey = useCache 
                ? generateCacheKey('find', collection, { queryParams, skip, limit, sort, fields }) 
                : null;
            
            let filterParts = [];
            let bindVars = {};
            
            // Build filter conditions
            Object.entries(queryParams).forEach(([key, value], index) => {
                const bindVar = `var${index}`;
                filterParts.push(`doc.${key} == @${bindVar}`);
                bindVars[bindVar] = value;
            });
            
            const filterClause = filterParts.length > 0 
                ? `FILTER ${filterParts.join(' AND ')}` 
                : '';
            
            // Build sort clause
            let sortClause = '';
            if (sort) {
                const sortParts = [];
                Object.entries(sort).forEach(([field, direction]) => {
                    sortParts.push(`doc.${field} ${direction > 0 ? 'ASC' : 'DESC'}`);
                });
                
                if (sortParts.length > 0) {
                    sortClause = `SORT ${sortParts.join(', ')}`;
                }
            }
            
            // Build projection
            const projection = fields && fields.length > 0
                ? `RETURN KEEP(doc, ${JSON.stringify(fields)})`
                : 'RETURN UNSET(doc, "_id", "_rev")';
            
            // Build the query
            const aqlQuery = `
                FOR doc IN ${collection}
                ${filterClause}
                ${sortClause}
                LIMIT ${skip}, ${limit}
                ${projection}
            `;
            
            // Execute the query
            const queryObj = db._query(aqlQuery, bindVars);
            return executeQuery(queryObj, cacheKey, { useCache, cacheTtl });
        } catch (error) {
            throw new Error(`Failed to find documents: ${error.message}`);
        }
    },
    
    /**
     * Count documents matching a query
     * 
     * @param {string} collection - Collection name
     * @param {Object} queryParams - Query parameters
     * @param {Object} options - Query options
     * @returns {number} - Count of matching documents
     */
    count(collection, queryParams = {}, options = {}) {
        try {
            validateCollection(collection);
            
            const { useCache = false, cacheTtl = DEFAULT_CACHE_TTL } = options;
            
            const cacheKey = useCache 
                ? generateCacheKey('count', collection, queryParams) 
                : null;
            
            let filterParts = [];
            let bindVars = {};
            
            // Build filter conditions
            Object.entries(queryParams).forEach(([key, value], index) => {
                const bindVar = `var${index}`;
                filterParts.push(`doc.${key} == @${bindVar}`);
                bindVars[bindVar] = value;
            });
            
            const filterClause = filterParts.length > 0 
                ? `FILTER ${filterParts.join(' AND ')}` 
                : '';
            
            // Build the query
            const aqlQuery = `
                FOR doc IN ${collection}
                ${filterClause}
                COLLECT WITH COUNT INTO count
                RETURN count
            `;
            
            // Execute the query
            const queryObj = db._query(aqlQuery, bindVars);
            const results = executeQuery(queryObj, cacheKey, { useCache, cacheTtl });
            return results[0] || 0;
        } catch (error) {
            throw new Error(`Failed to count documents: ${error.message}`);
        }
    },
    
    /**
     * Insert a document
     * 
     * @param {string} collection - Collection name
     * @param {Object} doc - Document to insert
     * @param {Object} options - Insert options
     * @returns {Object} - Inserted document
     */
    insert(collection, doc, options = {}) {
        try {
            validateCollection(collection);
            
            if (!doc || typeof doc !== 'object') {
                throw new Error('Document must be a non-empty object');
            }
            
            const { returnNew = true, overwrite = false } = options;
            
            // Add timestamps
            const timestamp = new Date().getTime();
            const documentWithTimestamps = {
                ...doc,
                createdOn: timestamp,
                updatedOn: timestamp
            };
            
            // Build the query
            const queryObj = query`
                INSERT ${documentWithTimestamps} 
                INTO ${db._collection(collection)} 
                ${overwrite ? aql`OPTIONS { overwrite: true }` : aql``}
                RETURN ${returnNew ? aql`NEW` : aql`{ _key: NEW._key }`}
            `;
            
            // Execute the query
            const results = executeQuery(queryObj);
            
            // Clear collection cache after write operation
            clearCollectionCache(collection);
            
            // Return inserted document
            return results[0];
        } catch (error) {
            throw new Error(`Failed to insert document: ${error.message}`);
        }
    },
    
    /**
     * Insert multiple documents
     * 
     * @param {string} collection - Collection name
     * @param {Array} docs - Documents to insert
     * @param {Object} options - Insert options
     * @returns {Array} - Inserted documents
     */
    insertMany(collection, docs, options = {}) {
        try {
            validateCollection(collection);
            
            if (!Array.isArray(docs) || docs.length === 0) {
                throw new Error('Documents must be a non-empty array');
            }
            
            const { returnNew = true } = options;
            
            // Add timestamps to each document
            const timestamp = new Date().getTime();
            const documentsWithTimestamps = docs.map(doc => ({
                ...doc,
                createdOn: timestamp,
                updatedOn: timestamp
            }));
            
            // Build the query
            const queryObj = query`
                FOR doc IN ${documentsWithTimestamps}
                    INSERT doc INTO ${db._collection(collection)}
                    RETURN ${returnNew ? aql`NEW` : aql`{ _key: NEW._key }`}
            `;
            
            // Execute the query
            const results = executeQuery(queryObj);
            
            // Clear collection cache after write operation
            clearCollectionCache(collection);
            
            // Return inserted documents
            return results;
        } catch (error) {
            throw new Error(`Failed to insert documents: ${error.message}`);
        }
    },
    
    /**
     * Update a document
     * 
     * @param {string} collection - Collection name
     * @param {string} docId - Document ID
     * @param {Object} doc - Document update
     * @param {Object} options - Update options
     * @returns {Object} - Updated document
     */
    update(collection, docId, doc, options = {}) {
        try {
            validateCollection(collection);
            validateDocId(docId);
            
            if (!doc || typeof doc !== 'object') {
                throw new Error('Document must be a non-empty object');
            }
            
            const { returnNew = true, keepNull = true, mergeObjects = true } = options;
            
            // Add updated timestamp
            const documentWithTimestamp = {
                ...doc,
                updatedOn: new Date().getTime()
            };
            
            // Build the query
            const queryObj = query`
                UPDATE ${docId} 
                WITH ${documentWithTimestamp} 
                IN ${db._collection(collection)} 
                OPTIONS { keepNull: ${keepNull}, mergeObjects: ${mergeObjects} }
                RETURN ${returnNew ? aql`NEW` : aql`{ _key: NEW._key }`}
            `;
            
            // Execute the query
            const results = executeQuery(queryObj);
            
            // Clear collection cache after write operation
            clearCollectionCache(collection);
            
            // Return updated document
            return results[0];
        } catch (error) {
            throw new Error(`Failed to update document: ${error.message}`);
        }
    },
    
    /**
     * Update multiple documents
     * 
     * @param {string} collection - Collection name
     * @param {Object} filter - Filter to select documents
     * @param {Object} update - Update to apply
     * @param {Object} options - Update options
     * @returns {Array} - Updated documents
     */
    updateMany(collection, filter, update, options = {}) {
        try {
            validateCollection(collection);
            
            if (!filter || typeof filter !== 'object') {
                throw new Error('Filter must be a non-empty object');
            }
            
            if (!update || typeof update !== 'object') {
                throw new Error('Update must be a non-empty object');
            }
            
            const { returnNew = true, keepNull = true, mergeObjects = true } = options;
            
            // Add updated timestamp
            const updateWithTimestamp = {
                ...update,
                updatedOn: new Date().getTime()
            };
            
            // Build filter conditions
            let filterParts = [];
            let bindVars = {};
            
            // Build filter conditions
            Object.entries(filter).forEach(([key, value], index) => {
                const bindVar = `var${index}`;
                filterParts.push(`doc.${key} == @${bindVar}`);
                bindVars[bindVar] = value;
            });
            
            const filterClause = filterParts.length > 0 
                ? `FILTER ${filterParts.join(' AND ')}` 
                : '';
            
            // Build the query
            const aqlQuery = `
                FOR doc IN ${collection}
                ${filterClause}
                UPDATE doc._key
                WITH ${JSON.stringify(updateWithTimestamp)}
                IN ${collection}
                OPTIONS { keepNull: ${keepNull}, mergeObjects: ${mergeObjects} }
                RETURN ${returnNew ? 'NEW' : '{ _key: NEW._key }'}
            `;
            
            // Execute the query
            const queryObj = db._query(aqlQuery, bindVars);
            const results = executeQuery(queryObj);
            
            // Clear collection cache after write operation
            clearCollectionCache(collection);
            
            // Return updated documents
            return results;
        } catch (error) {
            throw new Error(`Failed to update documents: ${error.message}`);
        }
    },
    
    /**
     * Replace a document
     * 
     * @param {string} collection - Collection name
     * @param {string} docId - Document ID
     * @param {Object} doc - New document
     * @param {Object} options - Replace options
     * @returns {Object} - Replaced document
     */
    replace(collection, docId, doc, options = {}) {
        try {
            validateCollection(collection);
            validateDocId(docId);
            
            if (!doc || typeof doc !== 'object') {
                throw new Error('Document must be a non-empty object');
            }
            
            const { returnNew = true, keepNull = true } = options;
            
            // Preserve creation timestamp if available and add updated timestamp
            const [existingDoc] = query`
                RETURN DOCUMENT(${db._collection(collection)}, ${docId})
            `.toArray();
            
            const timestamp = new Date().getTime();
            const documentWithTimestamps = {
                ...doc,
                createdOn: existingDoc ? existingDoc.createdOn : timestamp,
                updatedOn: timestamp
            };
            
            // Build the query
            const queryObj = query`
                REPLACE ${docId} 
                WITH ${documentWithTimestamps} 
                IN ${db._collection(collection)} 
                OPTIONS { keepNull: ${keepNull} }
                RETURN ${returnNew ? aql`NEW` : aql`{ _key: NEW._key }`}
            `;
            
            // Execute the query
            const results = executeQuery(queryObj);
            
            // Clear collection cache after write operation
            clearCollectionCache(collection);
            
            // Return replaced document
            return results[0];
        } catch (error) {
            throw new Error(`Failed to replace document: ${error.message}`);
        }
    },
    
    /**
     * Remove a document
     * 
     * @param {string} collection - Collection name
     * @param {string} docId - Document ID
     * @param {Object} options - Remove options
     * @returns {Object} - Removed document key
     */
    remove(collection, docId, options = {}) {
        try {
            validateCollection(collection);
            validateDocId(docId);
            
            const { returnOld = false, ignoreErrors = false } = options;
            
            // Check if document exists if not ignoring errors
            if (!ignoreErrors) {
                const exists = this.get(collection, docId);
                if (!exists) {
                    return null;
                }
            }
            
            // Build the query
            const queryObj = query`
                REMOVE ${docId} 
                IN ${db._collection(collection)} 
                RETURN ${returnOld ? aql`OLD` : aql`{ _key: OLD._key }`}
            `;
            
            // Execute the query
            const results = executeQuery(queryObj);
            
            // Clear collection cache after write operation
            clearCollectionCache(collection);
            
            // Return removed document key
            return results[0];
        } catch (error) {
            throw new Error(`Failed to remove document: ${error.message}`);
        }
    },
    
    /**
     * Remove multiple documents
     * 
     * @param {string} collection - Collection name
     * @param {Object} filter - Filter to select documents
     * @param {Object} options - Remove options
     * @returns {Array} - Removed document keys
     */
    removeMany(collection, filter, options = {}) {
        try {
            validateCollection(collection);
            
            if (!filter || typeof filter !== 'object') {
                throw new Error('Filter must be a non-empty object');
            }
            
            const { returnOld = false } = options;
            
            // Build filter conditions
            let filterParts = [];
            let bindVars = {};
            
            // Build filter conditions
            Object.entries(filter).forEach(([key, value], index) => {
                const bindVar = `var${index}`;
                filterParts.push(`doc.${key} == @${bindVar}`);
                bindVars[bindVar] = value;
            });
            
            const filterClause = filterParts.length > 0 
                ? `FILTER ${filterParts.join(' AND ')}` 
                : '';
            
            // Build the query
            const aqlQuery = `
                FOR doc IN ${collection}
                ${filterClause}
                REMOVE doc._key IN ${collection}
                RETURN ${returnOld ? 'OLD' : '{ _key: OLD._key }'}
            `;
            
            // Execute the query
            const queryObj = db._query(aqlQuery, bindVars);
            const results = executeQuery(queryObj);
            
            // Clear collection cache after write operation
            clearCollectionCache(collection);
            
            // Return removed document keys
            return results;
        } catch (error) {
            throw new Error(`Failed to remove documents: ${error.message}`);
        }
    },
    
    /**
     * Execute a query in a transaction
     * 
     * @param {Function} action - Transaction action
     * @param {Object} options - Transaction options
     * @returns {any} - Transaction result
     */
    transaction(action, options = {}) {
        try {
            if (typeof action !== 'function') {
                throw new Error('Transaction action must be a function');
            }
            
            const { 
                collections = {},
                params = {},
                maxTransactionSize = null,
                lockTimeout = null,
                waitForSync = false
            } = options;
            
            // Default transaction options
            const transactionOptions = {
                collections,
                params,
                waitForSync
            };
            
            // Add optional transaction options
            if (maxTransactionSize !== null) {
                transactionOptions.maxTransactionSize = maxTransactionSize;
            }
            
            if (lockTimeout !== null) {
                transactionOptions.lockTimeout = lockTimeout;
            }
            
            // Execute the transaction
            const result = db._executeTransaction(transactionOptions, action);
            
            // Clear all caches after transaction
            queryCache.clear();
            
            return result;
        } catch (error) {
            throw new Error(`Transaction failed: ${error.message}`);
        }
    },
    
    /**
     * Execute a raw AQL query
     * 
     * @param {string} query - AQL query string
     * @param {Object} bindVars - Bind variables
     * @param {Object} options - Query options
     * @returns {Array} - Query results
     */
    query(query, bindVars = {}, options = {}) {
        try {
            if (!query || typeof query !== 'string') {
                throw new Error('Query must be a non-empty string');
            }
            
            const { useCache = false, cacheTtl = DEFAULT_CACHE_TTL } = options;
            
            const cacheKey = useCache 
                ? generateCacheKey('raw', query, bindVars) 
                : null;
            
            // Execute the query
            const queryObj = db._query(query, bindVars);
            return executeQuery(queryObj, cacheKey, { useCache, cacheTtl });
        } catch (error) {
            throw new Error(`Query execution failed: ${error.message}`);
        }
    },
    
    /**
     * Clear the query cache
     * 
     * @param {string} collection - Optional collection name to clear only that collection's cache
     */
    clearCache(collection = null) {
        if (collection) {
            clearCollectionCache(collection);
        } else {
            queryCache.clear();
        }
    },
    
    /**
     * Get cache statistics
     * 
     * @returns {Object} - Cache statistics
     */
    getCacheStats() {
        let activeEntries = 0;
        let expiredEntries = 0;
        const now = Date.now();
        
        queryCache.forEach(entry => {
            if (entry.expires > now) {
                activeEntries++;
            } else {
                expiredEntries++;
            }
        });
        
        return {
            totalEntries: queryCache.size,
            activeEntries,
            expiredEntries
        };
    },
    
    /**
     * Set cache time-to-live
     * 
     * @param {number} ttl - Time-to-live in milliseconds
     */
    setCacheTtl(ttl) {
        if (typeof ttl !== 'number' || ttl < 0) {
            throw new Error('Cache TTL must be a non-negative number');
        }
        
        DEFAULT_CACHE_TTL = ttl;
    }
};

module.exports = database;
