const {db} = require('@arangodb');

const collections = [
    {
        name: 'users',
        index: [
            {
                type: 'hash',
                unique: true,
                fields: ['email']
            }
        ]
    },

    {
        name: 'sessions'
    }
];

for (const col of collections)
{
    const {name, index} = col;

    //create collection if not exists
    if (!db._collection(name))
    {
        db._createDocumentCollection(name);
    }

    //ensure index, if any
    if (index && Array.isArray(index))
    {
        for (const ndx of index)
        {
            db._collection(name).ensureIndex(ndx);
        }
    }
}