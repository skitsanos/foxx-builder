/**
 * Exmaple on how to use FilterBuilder utility
 * ArangoDB Foxx Microservices Handler
 * @author skitsanos, https://github.com/skitsanos
 * @version 1.0.20201023
 */

const joi = require('joi');
const {query, aql} = require('@arangodb');

/*
 Payload for POST request:

 {
 "query": [
 {
 "key":"email",
 "op":"%",
 "value": "%skitsanos%"
 }
 ]
 }
 */

module.exports = {
    contentType: 'application/json',
    name: 'Examples - Complex Query via GET',
    body: {
        model: joi.object({
            query: joi.array().required()
        }).required()
    },
    handler: (req, res) =>
    {
        const {filter} = module.context.utils;

        const {skip = 0, pageSize = 25} = req.queryParams;

        const {query: queryPayload} = req.body;

        const queryResult = query`
            LET skip=${Number(skip)}
            LET pageSize=${Number(pageSize)}
            
            for doc in users
                ${filter(queryPayload)}
            limit skip,pageSize
            return doc
        `.toArray();

        res.send({result: queryResult});
    }
};