const {aql, query, time} = require('@arangodb');

module.exports = {
    contentType: 'application/json',
    name: 'Get users',
    handler: (req, res) =>
    {
        const {filter} = module.context.utils;

        const {skip = 0, pageSize = 25, q} = req.queryParams;

        const start = time();

        let dataQuery;

        try
        {

            dataQuery = JSON.parse(decodeURI(q));
            //console.log(dataQuery)
        } catch (e)
        {
            dataQuery = !q
                ? []
                : [
                    {
                        key: 'email',
                        op: '%',
                        value: `%${q}%`
                    }
                ];
        }

        const queryResult = query`      
         LET skip=${Number(skip)}
         LET pageSize=${Number(pageSize)}
        
        LET ds = (
            FOR doc IN users
                ${filter(dataQuery)}
                SORT doc._key DESC
                LIMIT skip,pageSize
            RETURN merge(
                UNSET(doc,"_rev","_id", "password"),
                {
                   
                })
        )
        
        LET total = (FOR doc IN users 
            ${filter(dataQuery)}
            COLLECT WITH COUNT INTO totalFound 
            RETURN totalFound)[0]
        
        RETURN {data: ds, total: total, pageSize: ${pageSize}, skip: ${skip} }          
        `.toArray()[0];

        res.send({result: queryResult, execTime: time() - start});
    }
};