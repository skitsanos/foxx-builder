/**
 * Exmaple on how to use FilterBuilder utility
 * ArangoDB Foxx Microservices Handler
 * @author skitsanos, https://github.com/skitsanos
 * @version 1.0.20201023
 */

const joi = require('joi');
const {query} = require('@arangodb');

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
        const {filterBuilder} = module.context.utils;

        const {skip, pageSize} = req.queryParams;

        const {query: queryPayload} = req.body;

        const qb = filterBuilder(queryPayload);

        console.log(qb);

        const queryResult = query`
            LET skip=${skip ? Number(skip) : 0}
            LET pageSize=${pageSize ? Number(pageSize) : 25}
            
            for doc in users
                ${qb}
            limit skip,pageSize
            return doc
        `.toArray();


        res.send({result: queryResult});
    }
};