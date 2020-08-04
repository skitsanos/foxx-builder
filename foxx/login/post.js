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

        if (crypto.sha384(`${username}:${password}`) !== crypto.sha384('demo:demo'))
        {
            res.throw(403, 'Not Authorized');
        }

        req.session = req.body;
        const meta = req.sessionStorage.save(req.session);

        res.send({result: 'ok', id: meta._key});
    }
};