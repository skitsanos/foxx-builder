/**
 * Root request handler
 * ArangoDB Foxx Microservices Handler
 * @author skitsanos, https://github.com/skitsanos
 * @version 1.0.20201019
 */


module.exports = {
    contentType: 'application/json',
    name: 'home',
    handler: (req, res) =>
    {
        const {manifest} = module.context;
        res.send({
            info: {
                name: manifest.name,
                version: manifest.version
            }
        });
    }
};