# Vector Search Operations

This module provides utilities for performing vector similarity searches in ArangoDB using functions introduced in ArangoDB 3.9+, including `COSINE_SIMILARITY()`, `L1_DISTANCE()`, and `L2_DISTANCE()`.

## Features

- **Cosine Similarity Search**: Find documents with vectors similar to a query vector
- **L1 Distance Search**: Find documents using Manhattan distance
- **L2 Distance Search**: Find documents using Euclidean distance
- **Filtering**: Combine vector search with traditional filters
- **Field Projection**: Return only specific fields
- **Score/Distance Inclusion**: Include similarity scores or distances in results

## Usage

### Basic Cosine Similarity Search

```javascript
const { db } = module.context;
const vectorSearch = db.vector;

// Search for documents similar to a query vector
const results = vectorSearch.cosineSimilarity(
    'documents',        // collection name
    'embedding',        // field containing the vector
    [0.1, 0.2, 0.3, 0.4], // query vector
    {
        limit: 10,      // number of results
        minScore: 0.8,  // minimum similarity score
        includeScore: true  // include scores in results
    }
);

// Each result will include the document and its similarity score
console.log(results);
// [
//   { _key: '123', text: 'Example document', embedding: [...], score: 0.95 },
//   { _key: '456', text: 'Another document', embedding: [...], score: 0.87 },
//   ...
// ]
```

### Using L2 Distance (Euclidean)

```javascript
const results = vectorSearch.l2Distance(
    'documents',        // collection name
    'embedding',        // field containing the vector
    [0.1, 0.2, 0.3, 0.4], // query vector
    {
        limit: 10,      // number of results
        maxDistance: 1.5, // maximum distance
        includeDistance: true  // include distances in results
    }
);

// Results are sorted by distance (ascending)
console.log(results);
// [
//   { _key: '123', text: 'Example document', embedding: [...], distance: 0.35 },
//   { _key: '456', text: 'Another document', embedding: [...], distance: 0.72 },
//   ...
// ]
```

### Combining with Filters

```javascript
// Search only within documents of a specific category
const results = vectorSearch.cosineSimilarity(
    'documents',  
    'embedding',
    [0.1, 0.2, 0.3, 0.4],
    {
        filter: { 
            category: 'science',
            isPublic: true
        },
        limit: 10
    }
);
```

### Field Projection

```javascript
// Return only specific fields
const results = vectorSearch.cosineSimilarity(
    'documents',  
    'embedding',
    [0.1, 0.2, 0.3, 0.4],
    {
        returnFields: ['_key', 'title', 'summary'], // Only return these fields
        includeScore: true
    }
);

// Results will only include specified fields plus score
console.log(results);
// [
//   { _key: '123', title: 'Document Title', summary: '...', score: 0.95 },
//   ...
// ]
```

## Working with Embeddings

The module includes placeholder functions for working with embeddings that need to be customized for your specific use case:

```javascript
// Store document with embedding
// Note: You need to implement the createEmbedding method first
const document = await vectorSearch.storeEmbedding(
    'documents',  
    { title: 'Example Document', content: 'This is the document content' },
    'content',    // Field containing text to embed
    'embedding'   // Field to store the vector embedding
);
```

### Implementing the Embedding Function

To use the `createEmbedding` function, you need to implement it based on your embedding source:

```javascript
// Using OpenAI embeddings (example)
const { default: axios } = require('@arangodb/request');

// Override the default createEmbedding method
vectorSearch.createEmbedding = async function(text) {
    const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
            input: text,
            model: 'text-embedding-ada-002'
        },
        {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );
    
    return response.data.data[0].embedding;
};

// Now you can use storeEmbedding
const result = await vectorSearch.storeEmbedding(
    'documents',
    { title: 'Test', content: 'This is a test document' },
    'content',
    'embedding'
);
```

## API Reference

### Cosine Similarity

```javascript
cosineSimilarity(collection, vectorField, queryVector, options)
```

- **collection** - Name of the collection
- **vectorField** - Field containing the vector in the document
- **queryVector** - Query vector to compare against
- **options** - Search options
  - **limit** - Maximum number of results (default: 10)
  - **minScore** - Minimum similarity score (default: null)
  - **includeScore** - Include score in results (default: true)
  - **returnFields** - Array of fields to return (default: null = all fields)
  - **filter** - Filter object for additional filtering (default: null)

### L2 Distance (Euclidean)

```javascript
l2Distance(collection, vectorField, queryVector, options)
```

- **collection** - Name of the collection
- **vectorField** - Field containing the vector in the document
- **queryVector** - Query vector to compare against
- **options** - Search options
  - **limit** - Maximum number of results (default: 10)
  - **maxDistance** - Maximum distance (default: null)
  - **includeDistance** - Include distance in results (default: true)
  - **returnFields** - Array of fields to return (default: null = all fields)
  - **filter** - Filter object for additional filtering (default: null)

### L1 Distance (Manhattan)

```javascript
l1Distance(collection, vectorField, queryVector, options)
```

- **collection** - Name of the collection
- **vectorField** - Field containing the vector in the document
- **queryVector** - Query vector to compare against
- **options** - Search options
  - **limit** - Maximum number of results (default: 10)
  - **maxDistance** - Maximum distance (default: null)
  - **includeDistance** - Include distance in results (default: true)
  - **returnFields** - Array of fields to return (default: null = all fields)
  - **filter** - Filter object for additional filtering (default: null)

## Resources

- [ArangoDB AQL Numeric Functions](https://docs.arangodb.com/3.11/aql/functions/numeric/)
- [Vector Search Best Practices](https://docs.arangodb.com/3.11/develop/vector-search/)
