# Enhanced Database Operations

This module provides enhanced database operations for ArangoDB Foxx services with transaction support, batching, error handling, and caching.

## Features

- **Comprehensive CRUD Operations**: Full set of operations for working with documents
- **Batch Operations**: Execute multiple operations efficiently
- **Transaction Support**: Ensure data consistency with atomic transactions
- **Query Caching**: Improve performance with built-in caching
- **Robust Error Handling**: Detailed error messages and validation
- **Field Projection**: Retrieve only the fields you need
- **Pagination Support**: Easy pagination for large result sets

## Basic Usage

```javascript
const db = require('../builder/database');

// Get a document
const user = db.get('users', 'user123');

// Find documents
const activeUsers = db.find('users', { status: 'active' });

// Insert a document
const newUser = db.insert('users', {
    username: 'johndoe',
    email: 'john@example.com'
});

// Update a document
const updatedUser = db.update('users', 'user123', {
    status: 'inactive'
});

// Remove a document
db.remove('users', 'user123');
```

## Advanced Features

### Query Caching

```javascript
// Get with caching
const user = db.get('users', 'user123', { 
    useCache: true,
    cacheTtl: 60000 // 1 minute
});

// Find with caching
const users = db.find('users', { status: 'active' }, {
    useCache: true
});

// Clear cache
db.clearCache(); // Clear all cache
db.clearCache('users'); // Clear only users collection cache

// Get cache stats
const stats = db.getCacheStats();
```

### Field Projection

```javascript
// Get only specific fields
const userProfile = db.get('users', 'user123', {
    fields: ['username', 'email', 'profile']
});

// Find with field projection
const userEmails = db.find('users', { status: 'active' }, {
    fields: ['email']
});
```

### Pagination

```javascript
// Get paginated results
const page1 = db.find('users', {}, {
    skip: 0,
    limit: 10
});

const page2 = db.find('users', {}, {
    skip: 10,
    limit: 10
});
```

### Sorting

```javascript
// Find with sorting
const newestUsers = db.find('users', {}, {
    sort: { createdOn: -1 } // Descending
});

const alphabeticalUsers = db.find('users', {}, {
    sort: { username: 1 } // Ascending
});
```

### Batch Operations

```javascript
// Batch multiple operations
const results = db.transaction(function(params) {
    const { db } = params;
    
    // Perform multiple operations
    const user = db.insert('users', { username: 'jane' });
    const profile = db.insert('profiles', { 
        userId: user._key,
        bio: 'Hello world'
    });
    
    return {
        user,
        profile
    };
}, {
    collections: {
        write: ['users', 'profiles']
    },
    params: { db }
});
```

## Transactions

For more complex transaction needs, you can use the transaction module:

```javascript
const { transaction } = require('../builder/database');

// Execute a transaction
const result = transaction.execute(function(params) {
    const { user } = params;
    
    // Execute transaction code here
    const col = db._collection('users');
    col.insert(user);
    
    return 'success';
}, {
    write: ['users']
}, {
    params: { user: { name: 'John' } }
});

// Use the transaction builder
const result = transaction.builder()
    .insert('users', { username: 'john' })
    .insert('profiles', { userId: '123', bio: 'Hello' })
    .update('status', '123', { lastSeen: Date.now() })
    .execute();
```

## Error Handling

All operations include comprehensive error handling:

```javascript
try {
    const user = db.get('users', 'nonexistent');
} catch (error) {
    console.error(error.message); // "Failed to get document: Document not found"
}
```

## API Reference

### Document Operations

- **get(collection, docId, options)**: Get a document by ID
- **find(collection, queryParams, options)**: Find documents by query
- **count(collection, queryParams, options)**: Count documents matching a query
- **insert(collection, doc, options)**: Insert a document
- **insertMany(collection, docs, options)**: Insert multiple documents
- **update(collection, docId, doc, options)**: Update a document
- **updateMany(collection, filter, update, options)**: Update multiple documents
- **replace(collection, docId, doc, options)**: Replace a document
- **remove(collection, docId, options)**: Remove a document
- **removeMany(collection, filter, options)**: Remove multiple documents

### Transaction Operations

- **transaction(action, options)**: Execute a function in a transaction

### Cache Operations

- **clearCache(collection)**: Clear the query cache
- **getCacheStats()**: Get cache statistics
- **setCacheTtl(ttl)**: Set cache time-to-live
