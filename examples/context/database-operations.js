/**
 * Enhanced Database Operations Examples
 * 
 * Demonstrates the enhanced database utilities available in the Foxx Builder context.
 * These utilities provide simplified, secure, and efficient database operations.
 */

// Example route handler demonstrating enhanced database operations
module.exports = {
    name: 'Database Operations Examples',
    handler: (req, res) => {
        const { db } = module.context;
        
        // Example: Basic CRUD operations
        function basicCrudExamples() {
            // Create a new document
            const newUser = db.insert('users', {
                username: 'john_doe',
                email: 'john@example.com',
                createdAt: Date.now(),
                active: true
            });
            
            // Read a document by ID
            const user = db.get('users', newUser._key);
            
            // Update a document
            const updatedUser = db.update('users', newUser._key, {
                lastLogin: Date.now(),
                loginCount: (user.loginCount || 0) + 1
            });
            
            // Delete a document
            const deleted = db.remove('users', newUser._key);
            
            return { newUser, user, updatedUser, deleted };
        }
        
        // Example: Advanced querying with find
        function advancedQueryExamples() {
            // Find with filters
            const activeUsers = db.find('users', 
                { active: true },                    // Filter conditions
                { 
                    limit: 20,                       // Pagination
                    offset: 0,
                    sort: { createdAt: -1 },         // Sort by creation date DESC
                    fields: ['username', 'email']    // Select specific fields
                }
            );
            
            // Find with complex filters
            const recentUsers = db.find('users', {
                createdAt: { $gte: Date.now() - 86400000 }, // Last 24 hours
                active: true,
                roles: { $in: ['user', 'premium'] }
            });
            
            // Find with text search
            const searchResults = db.find('users', {
                $text: 'john developer'              // Full-text search
            }, {
                limit: 10,
                useCache: true,                      // Enable caching
                cacheTtl: 300000                     // 5 minute cache
            });
            
            return { activeUsers, recentUsers, searchResults };
        }
        
        // Example: Batch operations
        function batchOperationExamples() {
            // Batch insert
            const users = [
                { username: 'user1', email: 'user1@example.com' },
                { username: 'user2', email: 'user2@example.com' },
                { username: 'user3', email: 'user3@example.com' }
            ];
            
            const batchResult = db.batchInsert('users', users);
            
            // Batch update
            const userIds = batchResult.map(doc => doc._key);
            const batchUpdateResult = db.batchUpdate('users', userIds, {
                updatedAt: Date.now(),
                batchProcessed: true
            });
            
            // Batch remove
            const batchRemoveResult = db.batchRemove('users', userIds);
            
            return { batchResult, batchUpdateResult, batchRemoveResult };
        }
        
        // Example: Advanced AQL queries
        function customQueryExamples() {
            // Custom AQL query
            const result = db.query(`
                FOR user IN users
                    FILTER user.active == true
                    LET postCount = LENGTH(
                        FOR post IN posts
                            FILTER post.authorId == user._key
                            RETURN 1
                    )
                    SORT postCount DESC
                    LIMIT 10
                    RETURN {
                        username: user.username,
                        email: user.email,
                        postCount: postCount
                    }
            `);
            
            // Parameterized query
            const usersByRole = db.query(`
                FOR user IN users
                    FILTER user.role == @role
                    AND user.createdAt >= @since
                    SORT user.createdAt DESC
                    RETURN user
            `, {
                role: req.queryParams.role || 'user',
                since: Date.now() - 7 * 24 * 60 * 60 * 1000  // Last week
            });
            
            return { topPosters: result, usersByRole };
        }
        
        // Example: Aggregation operations
        function aggregationExamples() {
            // Count documents
            const userCount = db.count('users', { active: true });
            
            // Group by and aggregate
            const userStats = db.query(`
                FOR user IN users
                    COLLECT role = user.role WITH COUNT INTO groupCount
                    RETURN {
                        role: role,
                        count: groupCount
                    }
            `);
            
            // Calculate averages and sums
            const orderStats = db.query(`
                FOR order IN orders
                    FILTER order.status == 'completed'
                    COLLECT AGGREGATE 
                        totalRevenue = SUM(order.amount),
                        avgOrderValue = AVERAGE(order.amount),
                        totalOrders = LENGTH(order)
                    RETURN {
                        totalRevenue,
                        avgOrderValue,
                        totalOrders
                    }
            `);
            
            return { userCount, userStats, orderStats };
        }
        
        // Example: Relationship queries (joins)
        function relationshipExamples() {
            // User with their posts
            const usersWithPosts = db.query(`
                FOR user IN users
                    LET userPosts = (
                        FOR post IN posts
                            FILTER post.authorId == user._key
                            SORT post.createdAt DESC
                            LIMIT 5
                            RETURN post
                    )
                    FILTER LENGTH(userPosts) > 0
                    RETURN {
                        user: user,
                        posts: userPosts,
                        postCount: LENGTH(userPosts)
                    }
            `);
            
            // Comments with user and post information
            const commentsWithContext = db.query(`
                FOR comment IN comments
                    LET post = DOCUMENT('posts', comment.postId)
                    LET author = DOCUMENT('users', comment.authorId)
                    SORT comment.createdAt DESC
                    LIMIT 20
                    RETURN {
                        comment: comment,
                        post: {
                            title: post.title,
                            id: post._key
                        },
                        author: {
                            username: author.username,
                            id: author._key
                        }
                    }
            `);
            
            return { usersWithPosts, commentsWithContext };
        }
        
        // Example: Vector search operations
        function vectorSearchExamples() {
            // Semantic search using vector similarity
            const searchVector = [0.1, 0.2, 0.3, 0.4, 0.5]; // Example embedding
            
            const similarDocuments = db.vectorSearch('documents', searchVector, {
                limit: 10,
                distance: 'cosine',                  // cosine, l1, l2
                threshold: 0.8                      // Minimum similarity
            });
            
            // Hybrid search (vector + text filters)
            const hybridResults = db.vectorSearch('documents', searchVector, {
                limit: 20,
                distance: 'cosine',
                filters: {
                    category: 'technical',
                    published: true,
                    createdAt: { $gte: Date.now() - 30 * 24 * 60 * 60 * 1000 }
                }
            });
            
            return { similarDocuments, hybridResults };
        }
        
        // Example: Error handling patterns
        function errorHandlingExamples() {
            try {
                // Attempt operation that might fail
                const result = db.get('users', 'non-existent-id');
                return result;
            } catch (error) {
                if (error.errorNum === 1202) {  // Document not found
                    return { error: 'User not found', code: 'USER_NOT_FOUND' };
                }
                
                // Re-throw unexpected errors
                throw error;
            }
        }
        
        // Example: Performance optimization
        function performanceExamples() {
            // Use indexes for better performance
            const optimizedQuery = db.find('users', {
                email: 'john@example.com'           // Uses email index
            });
            
            // Batch operations for efficiency
            const batchSize = 100;
            const largeDataset = [];
            for (let i = 0; i < 1000; i++) {
                largeDataset.push({ 
                    name: `User ${i}`, 
                    value: Math.random() 
                });
            }
            
            // Process in batches
            const results = [];
            for (let i = 0; i < largeDataset.length; i += batchSize) {
                const batch = largeDataset.slice(i, i + batchSize);
                const batchResult = db.batchInsert('temp_data', batch);
                results.push(batchResult);
            }
            
            return { optimizedQuery, batchResults: results };
        }
        
        // Run examples based on query parameter
        const exampleType = req.queryParams.example || 'basic';
        
        switch (exampleType) {
            case 'basic':
                return basicCrudExamples();
            case 'advanced':
                return advancedQueryExamples();
            case 'batch':
                return batchOperationExamples();
            case 'custom':
                return customQueryExamples();
            case 'aggregation':
                return aggregationExamples();
            case 'relationships':
                return relationshipExamples();
            case 'vector':
                return vectorSearchExamples();
            case 'error':
                return errorHandlingExamples();
            case 'performance':
                return performanceExamples();
            default:
                res.json({
                    message: 'Database operations examples',
                    availableExamples: [
                        'basic', 'advanced', 'batch', 'custom', 
                        'aggregation', 'relationships', 'vector', 
                        'error', 'performance'
                    ],
                    usage: '?example=basic'
                });
        }
    }
};