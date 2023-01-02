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
        const {utils, update, auth} = module.context;

        const {username, password} = req.body;

        const [queryResult] = query`
            for doc in users
            filter 
                doc.email == ${username}
                &&
                doc.password == ${crypto.sha384(password)}
            RETURN doc`
        .toArray();

        if (!Boolean(queryResult))
        {
            res.throw(403, 'Not Authorized');
        }

        //drop password
        delete queryResult._id;
        delete queryResult._rev;
        delete queryResult.password;

        //update lastLogin
        update('users', queryResult._key, {lastLogin: new Date().getTime()});

        const doc = {
            user: {
                ...queryResult
            },
            session: {
                token: auth.encode({
                    userId: queryResult._key
                })
            }
        };

        if (utils.isEmail(username))
        {
            doc.user.gravatar = `https://www.gravatar.com/avatar/${crypto.md5(username)}?d=robohash&s=150`;
        }

        res.send({result: doc});
    }
};