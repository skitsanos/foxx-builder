/**
 * List Users Endpoint
 *
 * Retrieves a paginated list of users with filtering options
 * Regular users can only see basic user info, admins see more details
 *
 * @version 2.0.0
 * @author skitsanos
 */
const {
    time,
    db,
    aql
} = require('@arangodb');
const joi = require('joi');

/**
 * Parse string to an array of words for search
 * @param {String} inputString - Input search query
 * @returns {String[]} - Array of parsed search tokens
 */
const parseString = inputString =>
{
    const stopWords = [
        'of',
        'the',
        'it',
        'and',
        'und',
        'a',
        '-'
    ];

    const regex = /"[^"]+"|\S+/igu;
    const parsedInput = inputString.match(regex);

    if (parsedInput)
    {
        return parsedInput.filter((word) => !stopWords.includes(word.toLowerCase()));
    }

    return [];
};

/**
 * List Users
 */
module.exports = {
    name: 'List Users',

    // Define query parameters for pagination and filtering
    params: {
        query: {
            skip: {
                schema: joi.number().integer().min(0).default(0),
                description: 'Number of records to skip'
            },
            limit: {
                schema: joi.number().integer().min(1).max(100).default(25),
                description: 'Maximum number of records to return'
            },
            q: {
                schema: joi.string().allow('').optional(),
                description: 'Search query'
            },
            role: {
                schema: joi.string().allow('').optional(),
                description: 'Filter by role ID'
            },
            sortBy: {
                schema: joi.string().valid('username', 'createdOn', 'lastLogin').default('createdOn'),
                description: 'Field to sort by'
            },
            sortOrder: {
                schema: joi.string().valid('asc', 'desc').default('desc'),
                description: 'Sort order (asc or desc)'
            }
        }
    },

    // Define possible errors
    error: [
        {'403': 'Access denied'},
        {'500': 'Database error'}
    ],

    /**
     * Handle request to list users
     *
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) =>
    {
        // Check if user is authenticated
        if (!req.user)
        {
            return res.throw(403, 'Authentication required');
        }

        const {filterBuilder} = module.context.queries;
        const isAdmin = req.user.roles && req.user.roles.includes('admin');

        // Get and validate query parameters
        const {
            skip = 0,
            limit = 25,
            q = '',
            role = '',
            sortBy = 'createdOn',
            sortOrder = 'desc'
        } = req.queryParams;

        // Validate and sanitize pagination parameters
        const validLimit = Math.min(parseInt(limit) || 25, 100);
        const validSkip = parseInt(skip) || 0;

        // Parse search query
        const queryTokens = q ? parseString(q) : [];
        let [filter, bindVars] = filterBuilder(queryTokens, 'user', [
            'username',
            'email',
            'firstName',
            'lastName'
        ]);

        // Add role filter if specified
        let roleFilter = '';
        if (role)
        {
            roleFilter = `AND ${role} IN user.roles`;
        }

        const start = time();

        try
        {
            // Determine which fields to return based on user role
            const fieldsToReturn = isAdmin ?
                                   `UNSET(user, "_rev", "_id", "password")` :
                                   `KEEP(user, "_key", "username", "firstName", "lastName", "profileImage")`;

            // Determine sort field and direction
            const sortField = sortBy === 'username' ? 'user.username' :
                              sortBy === 'lastLogin' ? 'user.lastLogin' : 'user.createdOn';
            const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            // Main query with appropriate access control
            const [result] = db._query(`      
             LET skip=${validSkip}
             LET pageSize=${validLimit}
             
             LET total = (
                FOR user IN users
                    FILTER ${filter} ${roleFilter}
                    COLLECT WITH COUNT INTO counter
                RETURN counter
             )[0]
            
             LET ds = (
                FOR user IN users
                    FILTER
                    ${filter} ${roleFilter}
                    SORT ${sortField} ${sortDirection}
                    LIMIT skip, pageSize
                RETURN ${fieldsToReturn}
            )
                    
            RETURN {data: ds, total, skip, limit: pageSize}          
            `, bindVars).toArray();

            // For admin users, add role information to each user
            if (isAdmin && result.data && result.data.length > 0)
            {
                const userKeys = result.data.map(user => user._key);

                // Get role information for these users
                const roleData = db._query(`
                    FOR user IN users
                    FILTER user._key IN ${userKeys}
                    LET userRoles = (
                        FOR roleId IN user.roles || []
                        LET role = DOCUMENT('roles', roleId)
                        FILTER role != null
                        RETURN {
                            _key: role._key,
                            name: role.name
                        }
                    )
                    RETURN {
                        _key: user._key,
                        roles: userRoles
                    }
                `).toArray();

                // Create a map for quick lookup
                const roleMap = {};
                roleData.forEach(item =>
                {
                    roleMap[item._key] = item.roles;
                });

                // Add roles to each user in the result
                result.data = result.data.map(user => ({
                    ...user,
                    roles: roleMap[user._key] || []
                }));
            }

            res.json({
                ...result,
                meta: {
                    execTime: time() - start
                }
            });
        }
        catch (error)
        {
            console.error(`Error fetching users:`, error.message);
            res.throw(500, 'Error retrieving user data');
        }
    }
};