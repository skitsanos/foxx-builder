const {query, time} = require('@arangodb');

module.exports = {
    contentType: 'application/json',
    name: 'Get users',
    handler: (req, res) =>
    {
        const {skip = 0, pageSize = 25, q} = req.queryParams;

        const start = time();

        const searchQuery = Boolean(q) ? `%${q}%` : '%%';

        const queryResult = query`      
         LET skip=${Number(skip)}
         LET pageSize=${Number(pageSize)}
        
        LET ds = (
            FOR doc IN users
                FILTER 
                    LIKE(doc.name, ${searchQuery}) 
                    || 
                    LIKE(doc.email, ${searchQuery})
                SORT doc._key DESC
                LIMIT skip,pageSize
            RETURN merge(
                UNSET(doc,"_rev","_id", "password"),
                {
                   
                })
        )
        
        LET total = (FOR doc IN users 
            FILTER 
                LIKE(doc.name, ${searchQuery}) 
                    || 
                    LIKE(doc.email, ${searchQuery})
            COLLECT WITH COUNT INTO totalFound 
            RETURN totalFound)[0]
        
        RETURN {data: ds, total: total, pageSize: ${pageSize}, skip: ${skip} }          
        `.toArray()[0];

        res.send({result: queryResult, execTime: time() - start});
    }
};