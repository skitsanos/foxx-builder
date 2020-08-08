const joi = require('joi');
const {query} = require('@arangodb');
const crypto = require('@arangodb/crypto');

module.exports = {
    contentType: 'application/json',
    name: 'Login',

    body: {
        model: joi.object({
            username: joi.string().required(),
            password: joi.string().required()
        }).required()
    },

    handler: (req, res) =>
    {
        const {username, password} = req.body;

        const queryResult = query`
            for doc in users
            filter 
                doc.email == ${username}
                &&
                doc.password == ${crypto.sha384(password)}
            RETURN doc`
            .toArray()[0];

        if (!Boolean(queryResult))
        {
            res.throw(403, 'Not Authorized');
        }

        req.session.uid = queryResult._key;

        const meta = req.sessionStorage.save(req.session);

        res.send({result: 'ok', id: meta._key});
    }
};