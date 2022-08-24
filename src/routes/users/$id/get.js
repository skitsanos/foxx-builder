const {aql, query, time} = require('@arangodb');
module.exports = {
    contentType: 'application/json',
    name: 'Get user by id',
    handler: (req, res) =>
    {
        const {filter} = module.context.utils;

        const start = time();

        let dataQuery;


        res.send({
            result: true,
            execTime: time() - start
        });
    }
};