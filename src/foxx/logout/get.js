module.exports = {
    contentType: 'application/json',
    name: 'Logout',
    handler: (req, res) =>
    {
        if (req.session.uid)
        {
            req.session.uid = null;
            req.sessionStorage.save(req.session);
        }

        const sid = req.get('x-session-id');
        const {remove} = module.context;
        remove('sessions', sid);

        res.status('no content');
    }
};