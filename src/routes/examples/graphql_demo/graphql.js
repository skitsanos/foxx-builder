const {GraphQLString, GraphQLSchema, GraphQLObjectType, GraphQLList} = require('graphql');
const {query} = require('@arangodb');

const AuthorType = new GraphQLObjectType({
    name: 'Author',
    fields: {
        _key: {type: GraphQLString},
        name: {type: GraphQLString}
    },
    resolve: (_, author) =>
    {
        const result = query`
        FOR author IN Authors
        FILTER author._key == ${author._key}
        RETURN author
        `;
        return result.next();
    }
});

const ArticleType = new GraphQLObjectType({
    name: 'Article',
    fields: {
        _key: {type: GraphQLString},
        title: {type: GraphQLString},
        authorKey: {type: GraphQLString},
        author: {
            type: AuthorType,
            resolve: (parent) =>
            {
                const authorKey = parent.authorKey;
                const result = query`
                FOR author IN Authors
                FILTER author._key == ${authorKey}
                RETURN author
                `;
                return result.next();
            }
        }
    },
    resolve: (_, article) =>
    {
        const result = query`
        FOR author IN Authors
        FILTER author._key == ${article.authorKey}}
        RETURN author
        `;
        return result.next();
    }
});

module.exports = {
    schema: new GraphQLSchema({
        query: new GraphQLObjectType({
            name: 'RootQueryType',
            fields: {
                hello: {
                    type: GraphQLString,
                    resolve()
                    {
                        return 'world';
                    }
                },

                getArticle: {
                    type: ArticleType,

                    args: {
                        _key: {type: GraphQLString}
                    },

                    resolve(_, {_key})
                    {
                        const result = query`FOR article IN Articles
                            FILTER article._key == ${_key}
                            RETURN article`;
                        return result.next();
                    }

                },

                getAllArticles: {
                    type: new GraphQLList(ArticleType),
                    resolve()
                    {
                        const result = query`
                          FOR article IN Articles
                          RETURN article
                        `;
                        return result.toArray();
                    }
                }
            }
        })
    }),
    graphiql: true
};