POST {{URL}}/examples/graphql_demo

```graphql
{
    hello

    getArticle(_key: "3704"){
        title,
        author {name}
    },

    getAllArticles {
        title
    }
}
```