/**
 * Transaction Utilities for ArangoDB
 * 
 * Provides enhanced transaction helpers for common database operations
 * 
 * @version 1.0.0
 * @author skitsanos
 */

const { db } = require('@arangodb');

/**
 * Default transaction options
 * @type {Object}
 */
const DEFAULT_OPTIONS = {
    maxTransactionSize: 128 * 1024 * 1024, // 128MB
    waitForSync: true,
    lockTimeout: 60000 // 60 seconds
};

/**
 * Transaction utilities
 */
const transactions = {
    /**
     * Execute a function in a transaction
     * 
     * @param {Function} fn - Function to execute in transaction
     * @param {Object} collections - Collections to use in transaction
     * @param {Object} options - Transaction options
     * @returns {any} - Result of the transaction
     */
    execute(fn, collections = {}, options = {}) {
        // Merge default options with provided options
        const transactionOptions = {
            ...DEFAULT_OPTIONS,
            ...options,
            collections
        };

        try {
            return db._executeTransaction(transactionOptions, fn);
        } catch (error) {
            throw new Error(`Transaction failed: ${error.message}`);
        }
    },

    /**
     * Execute multiple operations atomically
     * 
     * @param {Array} operations - Array of operation objects
     * @param {Object} options - Transaction options
     * @returns {Array} - Results of each operation
     * 
     * Each operation object should have:
     * - type: 'insert', 'update', 'replace', 'remove'
     * - collection: collection name
     * - data: document or document ID (for remove/update)
     * - options: operation-specific options
     */
    batch(operations, options = {}) {
        if (!Array.isArray(operations) || operations.length === 0) {
            throw new Error('Operations must be a non-empty array');
        }

        // Collect all collections used in operations
        const collectionsUsed = new Set();
        for (const op of operations) {
            if (!op.collection) {
                throw new Error('Each operation must specify a collection');
            }
            collectionsUsed.add(op.collection);
        }

        // Setup collections for transaction
        const collections = {
            write: Array.from(collectionsUsed)
        };

        // Execute the transaction
        return this.execute(function(params) {
            const { operations } = params;
            const results = [];

            for (const op of operations) {
                const { type, collection, data, options = {} } = op;
                const col = db._collection(collection);

                if (!col) {
                    throw new Error(`Collection "${collection}" does not exist`);
                }

                let result;
                switch (type) {
                    case 'insert':
                        result = col.insert(data, options);
                        break;
                    case 'update':
                        if (!data.id) {
                            throw new Error('Document ID is required for update');
                        }
                        result = col.update(data.id, data.document, options);
                        break;
                    case 'replace':
                        if (!data.id) {
                            throw new Error('Document ID is required for replace');
                        }
                        result = col.replace(data.id, data.document, options);
                        break;
                    case 'remove':
                        result = col.remove(data, options);
                        break;
                    default:
                        throw new Error(`Unknown operation type: ${type}`);
                }

                results.push(result);
            }

            return results;
        }, collections, { params: { operations } });
    },

    /**
     * Create a transaction builder for fluent API
     * 
     * @returns {Object} - Transaction builder
     */
    builder() {
        const operations = [];
        const collectionsUsed = new Set();

        const builder = {
            /**
             * Add an insert operation
             * 
             * @param {string} collection - Collection name
             * @param {Object} document - Document to insert
             * @param {Object} options - Insert options
             * @returns {Object} - This builder for chaining
             */
            insert(collection, document, options = {}) {
                operations.push({
                    type: 'insert',
                    collection,
                    data: document,
                    options
                });
                collectionsUsed.add(collection);
                return this;
            },

            /**
             * Add an update operation
             * 
             * @param {string} collection - Collection name
             * @param {string} id - Document ID
             * @param {Object} document - Document update
             * @param {Object} options - Update options
             * @returns {Object} - This builder for chaining
             */
            update(collection, id, document, options = {}) {
                operations.push({
                    type: 'update',
                    collection,
                    data: { id, document },
                    options
                });
                collectionsUsed.add(collection);
                return this;
            },

            /**
             * Add a replace operation
             * 
             * @param {string} collection - Collection name
             * @param {string} id - Document ID
             * @param {Object} document - New document
             * @param {Object} options - Replace options
             * @returns {Object} - This builder for chaining
             */
            replace(collection, id, document, options = {}) {
                operations.push({
                    type: 'replace',
                    collection,
                    data: { id, document },
                    options
                });
                collectionsUsed.add(collection);
                return this;
            },

            /**
             * Add a remove operation
             * 
             * @param {string} collection - Collection name
             * @param {string} id - Document ID
             * @param {Object} options - Remove options
             * @returns {Object} - This builder for chaining
             */
            remove(collection, id, options = {}) {
                operations.push({
                    type: 'remove',
                    collection,
                    data: id,
                    options
                });
                collectionsUsed.add(collection);
                return this;
            },

            /**
             * Execute the transaction
             * 
             * @param {Object} options - Transaction options
             * @returns {Array} - Results of operations
             */
            execute(options = {}) {
                if (operations.length === 0) {
                    return [];
                }

                // Setup collections for transaction
                const collections = {
                    write: Array.from(collectionsUsed)
                };

                // Execute the transaction
                return transactions.execute(function(params) {
                    const { operations } = params;
                    const results = [];

                    for (const op of operations) {
                        const { type, collection, data, options = {} } = op;
                        const col = db._collection(collection);

                        if (!col) {
                            throw new Error(`Collection "${collection}" does not exist`);
                        }

                        let result;
                        switch (type) {
                            case 'insert':
                                result = col.insert(data, options);
                                break;
                            case 'update':
                                result = col.update(data.id, data.document, options);
                                break;
                            case 'replace':
                                result = col.replace(data.id, data.document, options);
                                break;
                            case 'remove':
                                result = col.remove(data, options);
                                break;
                            default:
                                throw new Error(`Unknown operation type: ${type}`);
                        }

                        results.push(result);
                    }

                    return results;
                }, collections, { ...options, params: { operations } });
            }
        };

        return builder;
    }
};

module.exports = transactions;
