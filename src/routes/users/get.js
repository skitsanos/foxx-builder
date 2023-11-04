const {
    time,
    db
} = require('@arangodb');

/**
 * Parse string to an array of words
 * @param {String} inputString
 * @returns {String[]}
 */
const parseString = inputString =>
{
    const stopWords = ['of', 'the', 'it', 'and', 'und', 'a', '-'];

    const regex = /"[^"]+"|\S+/igu;
    const parsedInput = inputString.match(regex);

    if (parsedInput)
    {
        return parsedInput.filter((word) => !stopWords.includes(word.toLowerCase()));
    }

    return [];
};

/**
 * Generate random users with AQL:
 *
 * for doc in 1..100
 *     let user = {
 *         username: concat('demo',doc),
 *         email: lower(concat('demo.', RANDOM_TOKEN(8), '@demo.local')),
 *         password: sha256(random_token(16))
 *     }
 *
 *     insert user in users
 *
 * return user
 *
 * @type {EndpointHandler}
 */
module.exports = {
    name: 'Get users',

    handler: (req, res) =>
    {
        const {filterBuilder} = module.context.queries;

        const {
            skip = 0,
            pageSize = 25,
            q
        } = req.queryParams;

        //const queryFilters = Object.keys(req.queryParams).filter(k => !['skip', 'pageSize', 'q'].includes(k));
        const queryTokens = parseString(q);

        const [filter, bindVars] = filterBuilder(queryTokens, 'user', ['username']);

        const start = time();

        const [result] = db._query(`      
         LET skip=${Number(skip)}
         LET pageSize=${Number(pageSize)}
         
         let total = (
            for user in users
                filter ${filter}
                collect with count into counter
            return counter
         )[0]
        
         LET ds = (
            FOR user IN users
                FILTER
                ${filter}
                SORT user._key DESC
                LIMIT skip,pageSize
            RETURN UNSET(user,"_rev","_id", "password")
        )
                
        RETURN {data: ds, total, skip, pageSize}          
        `, bindVars).toArray();

        res.json({
            ...result,
            execTime: time() - start
        });
    }
};