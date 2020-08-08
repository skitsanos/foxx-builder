const joi = require('joi');
const crypto = require('@arangodb/crypto');

module.exports = {
    contentType: 'application/json',
    name: 'Signup',

    body: {
        model: joi.object({
            username: joi.string().required(),
            password: joi.string().required()
        }).required()
    },

    error: [
        {'409': 'Already exists'}
    ],

    handler: (req, res) =>
    {
        const {username, password} = req.body;

        try
        {
            const {insert} = module.context;
            const qr = insert('users', {
                email: username,
                password: crypto.sha384(password)
            }).toArray()[0];

            res.send({result: qr._key});
        } catch (e)
        {
            res.throw(409, 'User already exists');
        }
    }
};