const {query, time, db} = require('@arangodb');

module.exports = {
    contentType: 'application/json',
    name: 'Get users',
    handler: (req, res) =>
    {
        const {rxQuery} = module.context.utils;

        const {skip = 0, pageSize = 25, q} = req.queryParams;

        const filter = rxQuery(q);

        const start = time();

        const cursor = query`      
         LET skip=${Number(skip)}
         LET pageSize=${Number(pageSize)}
        
         LET ds = (
            FOR doc IN users
                ${filter}
                SORT doc._key DESC
                LIMIT skip,pageSize
            RETURN merge(
                UNSET(doc,"_rev","_id", "password"),
                {
                   
                })
        )
                
        RETURN ds          
        `;

        const total = db.users.count({ filter });

        res.send({
            result: {
                data: cursor.toArray(),
                total,
                pageSize
            }, execTime: time() - start
        });
    }
};