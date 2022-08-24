module.exports = {
    contentType: 'application/json',
    name: 'Echo',
    handler: (req, res) =>
    {
        const {q, skip = 0, pageSize = 10} = req.queryParams;

        res.send({
            result: {
                endpoint: '/echo',
                config: module.context.configuration,
                header: req.headers,
                path: req.pathParams,
                query: req.queryParams,
                dataFilter: {
                    q,
                    skip,
                    pageSize
                },
                body: req.body
            }
        });
    }
};