module.exports = {
    contentType: 'application/json',
    name: 'Echo',
    handler: (req, res) =>
    {
        res.send({
            result: {
                endpoint: '/echo',
                config: module.context.configuration,
                header: req.headers,
                path: req.pathParams,
                query: req.queryParams,
                body: req.body
            }
        });
    }
};