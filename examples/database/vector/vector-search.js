/**
 * Example usage of vector search operations
 * 
 * This file demonstrates how to use the vector search operations
 * in your Foxx service routes.
 */

// Vector search example route handler
module.exports = {
    contentType: 'application/json',
    name: 'Vector search example',
    
    /**
     * Example handler showing different vector search operations
     */
    handler: (req, res) => {
        // Access the vector search module from the context
        const { db } = module.context;
        const vectorSearch = db.vector;
        
        // Example query vector (this would typically come from an embedding API)
        const queryVector = [0.13, 0.25, 0.76, 0.12, 0.45, 0.98, 0.27, 0.01];
        
        // Using cosine similarity search
        const similarDocuments = vectorSearch.cosineSimilarity(
            'documents',    // collection name
            'embedding',    // field containing vectors
            queryVector,    // query vector
            {
                limit: 5,
                minScore: 0.7,
                includeScore: true,
                returnFields: ['_key', 'title', 'summary']
            }
        );
        
        // Using L2 distance (Euclidean)
        const nearbyDocuments = vectorSearch.l2Distance(
            'documents',
            'embedding',
            queryVector,
            {
                limit: 3,
                maxDistance: 1.5,
                includeDistance: true
            }
        );
        
        // Using L1 distance (Manhattan) with filtering
        const filteredDocuments = vectorSearch.l1Distance(
            'documents',
            'embedding',
            queryVector,
            {
                filter: {
                    category: 'science',
                    isPublic: true
                },
                returnFields: ['_key', 'title', 'category']
            }
        );
        
        // Example of hybrid search (combining vector search with text search)
        // This would typically be done with a more complex AQL query
        const hybridSearch = (query, vector) => {
            const aqlQuery = `
                FOR doc IN documents
                    LET textScore = NGRAM_MATCH(doc.content, "${query}", "text_en")
                    LET vectorScore = COSINE_SIMILARITY(doc.embedding, ${JSON.stringify(vector)})
                    LET combinedScore = textScore * 0.3 + vectorScore * 0.7
                    FILTER combinedScore > 0.6
                    SORT combinedScore DESC
                    LIMIT 10
                    RETURN MERGE(
                        KEEP(doc, ["_key", "title", "summary"]),
                        { score: combinedScore }
                    )
            `;
            
            return db._query(aqlQuery).toArray();
        };
        
        const hybridResults = hybridSearch("quantum physics", queryVector);
        
        // Respond with all examples
        res.json({
            similarDocuments,
            nearbyDocuments,
            filteredDocuments,
            hybridResults
        });
    }
};
