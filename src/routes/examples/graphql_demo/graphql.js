const {buildSchema} = require('graphql');
const {query} = require('@arangodb');

// Define the GraphQL schema
const schema = buildSchema(`
  type Article {
    _key: String!
    title: String
    authorKey: ID!
    author: Author
  }

  type Author {
    _key: String!
    name: String
  }

  type Query {
    hello: String
    getArticle(_key: String!): Article
    allArticles: [Article]
  }
`);

// Define the resolvers for the schema
const resolvers = {
    Query: {
        hello: () => 'Hello world!',

        getArticle: ({_key}) =>
        {
            const [result] = query`
             FOR article IN Articles
                FILTER article._key == ${_key}
             RETURN article
            `.toArray();

            return result;
        },

        allArticles: () =>
        {
            return query`
            FOR article IN Articles 
            RETURN article`.toArray();
        }
    },

    Article: {
        author: (article) =>
        {
            const [result] = query`
            FOR author IN Authors
                FILTER author._key == ${article.authorKey}}
            RETURN author
            `;
            return result;
        }
    }
};

module.exports = {
    schema,
    rootValue: resolvers.Query,
    graphiql: true
};