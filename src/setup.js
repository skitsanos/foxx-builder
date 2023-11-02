const {db} = require('@arangodb');

const collections = [
    {
        name: 'users',
        index: [
            {
                type: 'hash',
                unique: true,
                fields: ['username']
            }
        ]
    },

    'Authors',
    'Articles'
];

for (const col of collections)
{
    if (typeof col === 'string' && !db._collection(col))
    {
        db._createDocumentCollection(col);
    }
    else
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

}