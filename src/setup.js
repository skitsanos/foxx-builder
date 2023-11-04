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

    if (typeof col !== 'string')
    {
        const {
            name,
            index
        } = col;

        // create collection if not exists
        if (!db._collection(name))
        {
            db._createDocumentCollection(name);
        }

        const {name: indexName = `index_${name}`} = index;

        // drop all indexes except primary
        for (const ndx of db._collection(name).getIndexes())
        {
            const {type} = ndx;
            if (type !== 'primary')
            {
                db._collection(name).dropIndex(ndx);
            }
        }

        // create indexes if not exists
        if (index && Array.isArray(index))
        {
            for (const ndx of index)
            {
                const {name: currentIndexName} = ndx;
                if (!currentIndexName)
                {
                    ndx.name = indexName;
                }
                db._collection(name).ensureIndex(ndx);
            }
        }
    }
}