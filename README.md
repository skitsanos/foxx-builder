# foxx-builder
> ArangoDB allows application developers to write their data access and domain logic as microservices running directly within the database with native access to in-memory data. The **Foxx microservice framework** makes it easy to extend ArangoDB’s own REST API with custom HTTP endpoints using modern JavaScript running on the same V8 engine you know from Node.js and the Google Chrome web browser.
>
> Unlike traditional approaches to storing logic in the database (like stored procedures), these microservices can be written as regular structured JavaScript applications that can be easily distributed and version controlled. Depending on your project’s needs Foxx can be used to build anything from optimized REST endpoints performing complex data access to entire standalone applications running directly inside the database.
>
> -- [Foxx Microservices](https://www.arangodb.com/docs/stable/foxx.html)

The idea behind this template is to help developers create and run ArangoDB Foxx Microservices with minimal effort and at no time by keeping each API endpoint method handler in its dedicated module. 

So, instead of having complex logic describing complete API endpoint functionality, we split it into smaller blocks that are easier to maintain and provide a better overview of the whole application.

### Getting started

1. `git clone` the whole thing, and you are good to go.

```sh
$git clone https://github.com/skitsanos/foxx-builder.git
```

In package.json in *scripts* section you will find a number of shortcuts that will help you register your server with foxx-cli, and install or replace Foxx microservice on your server.

2. Install foxx-cli if you don't have it yet [https://github.com/arangodb/foxx-cli#install](https://github.com/arangodb/foxx-cli#install)

3. Register your ArangoDB server so you can install and replace your Foxx Microservices, for example: 

   ```sh
   $foxx server set dev http://dev:sandbox@localhost:8529
   ```

By executing this command, we assume that you already created a user _dev_ with password _sandbox_ on _localhost_ server, and we register this server to foxx-cli as _dev_.

If you define servers using the `server` commands, a `.foxxrc` file will be created in your `$HOME` directory, which is typically one of the following paths:

- `/home/$USER` on Linux
- `/Users/$USER` on macOS
- `C:\Users\$USER` on Windows

This file contains sections for each server which may contain server credentials should you decide to save them.

4. The example below shows how you can install this Foxx Microservice on _dev_ server to _dev_ database and mount it as _/api_ endpoint.

   ```sh
   $foxx install /api . --server dev --database dev
   ```

### Folder Structure

There are very few bits required to make your foxx services up and running. The folder structure defined in a way that will help you to have better control over API application architecture with a minimal coding effort from your side.

```
/builder/
/foxx/
manifest.json
package.json
index.js
setup.js
```

_/builder_ is the actual Foxx Builder service with all its utils

_/foxx_ is the folder where you will create your API service handlers with convention described below;

_manifest.json_ is a Service Manifest file, as described on https://www.arangodb.com/docs/stable/foxx-reference-manifest.html;

setup.js - Setup script, as described on https://www.arangodb.com/docs/stable/foxx-guides-scripts.html#setup-script;

Inside the _/foxx_ folder will be placed API endpoint path handlers, where every part of the path will be correspondent to a dedicated folder that contains an HTTP method handler.

Out of the box, _foxx builder_ supports following HTTP methods:
- GET
- POST
- PUT
- DELETE

### Creating your first API endpoint

For the sake of convention, let's assume that all our foxx services will be mounted on ```/api``` route.

For example, we need to create a handler that will accept _all_ HTTP methods and respond to requests like this:

```
GET /api/echo
POST /api/echo
PUT /api/echo
DELETE /api/echo
```

To handle this case, we will add to _foxx_ folder our handler in this way:

```
/foxx/
--/echo/
----all.js
```

Another example - we need to add a ```/api/users``` route that on _GET_ method will reply with some data and on _POST_ will accept data sent to API and then respond.

```
/foxx
--/echo
----all.js
--/users
----get.js
----post.js
```

In other words, file path your API route method handler mirrors your URL path

| **API endpoint**                 | **Handler**                       |
| -------------------------------- | --------------------------------- |
| GET /api/echo                    | /api/echo/get.js                  |
| GET /api/users                   | /api/users/get.js                 |
| POST /api/users                  | /api/users/post.js                |
| GET /api/users/_:id_/tasks       | /api/users/$id/tasks/get.js       |
| GET /api/users/_:id_/tasks/:task | /api/users/$id/tasks/$task/get.js |

### Parametrized path

Adding parameters to your URL point handling is pretty simple. Probably, you already noticed from the table above, when we require some parameter, we add its name with $ in front of it in our folder name. Just make sure you don't have duplicating parameters.

| **API endpoint**                 | **Handler**                       |
| -------------------------------- | --------------------------------- |
| GET /api/users/_:id_/tasks/:task | /api/users/$id/tasks/$task/get.js |

```
/foxx/
--/users/
----get.js
----post.js
----/$id/
------get.js
------/tasks/
--------get.js
--------post.js
--------/$task/
----------get.js
```

More on path parameters you can read on [https://www.arangodb.com/docs/stable/foxx-getting-started.html#parameter-validation](https://www.arangodb.com/docs/stable/foxx-getting-started.html#parameter-validation).

### Validating payload sent to your endpoint

For HTTP methods like POST and PUT, you need to add to your handler additional property called `body`. If  it is set to `null`, request payload will be rejected. If you want to enable request body/payload validation, you need to set `body` property with at least adding schema to it.

`body` defines the request body recognized by the endpoint. There can only be one request body definition per endpoint. The definition will also be shown in the route details in the ArangoDB's API documentation.

In the absence of a request body definition, the request object’s *body* property will be initialized to the unprocessed *rawBody* buffer

```javascript
//users/post.js

module.exports = {
    contentType: 'application/json',
    name: 'Create new user',
    body: {model: joi.object().required()},
    handler: (req, res)=>
    {
        //your code here
        res.send({result: 'ok'});
    }
};
```

In the absence of a request body definition, the request object’s *body* property will be initialized to the unprocessed *rawBody* buffer.

As defined in ArangoDB's documentation, `body` accepts the following arguments that `foxx-builder` takes as object properties.

- **model**: `Model | Schema | null` (optional)

  A model or joi schema describing the request body. A validation failure will result in an automatic 400 (Bad Request) error response.

  If the value is a model with a `fromClient` method, that method will be applied to the parsed request body.

  If the value is a schema or a model with a schema, the schema will be used to validate the request body and the `value` property of the validation result of the parsed request body will be used instead of the parsed request body itself.

  If the value is a model or a schema and the MIME type has been omitted, the MIME type will default to JSON instead.

  If the value is explicitly set to `null`, no request body will be expected.

  If the value is an array containing exactly one model or schema, the request body will be treated as an array of items matching that model or schema.

- **mimes**: `Array<string>` (optional)

  An array of MIME types the route supports.

  Common non-mime aliases like “json” or “html” are also supported and will be expanded to the appropriate MIME type (e.g. “application/json” and “text/html”).

  If the MIME type is recognized by Foxx the request body will be parsed into the appropriate structure before being validated. Currently only JSON, `application/x-www-form-urlencoded` and multipart formats are supported in this way.

  If the MIME type indicated in the request headers does not match any of the supported MIME types, the first MIME type in the list will be used instead.

  Failure to parse the request body will result in an automatic 400 (Bad Request) error response.

- **description**: `string` (optional)

  A human readable string that will be shown in the API documentation.

### Context Utilities

`foxx-builder` comes with few Context Utilities that you can use to perform basic CRUD operations. Those are `get`, `insert`, `update` and `remove`.

```javascript
const {get, insert, update, remove} = module.context;
```

Arguments used for context operations:

- `get(store, docId)` - retrieves document from collection `store` by document `_docId`. 
- `insert(store, doc)` - inserts document `doc`into collection `store`. Adding `createdOn` and `updatedOn` properties set to current `new Date().getTime()`. Returns `NEW`.
- `update(store, docId, doc)`- updates collection `store` document `docId`with new content passed in `doc`. Updates `updatedOn` properties set to current `new Date().getTime()`. Returns `NEW`.
- `remove(store, docId)`- removes document by id `docId` from collection `store`. Returns `OLD` with only `_key` field in it.

```javascript
//users/$id/get.js

module.exports = {
    contentType: 'application/json',
    name: 'Get user by id',
    handler: (req, res) =>
    {
        const {id} = req.pathParams;

        const {get} = module.context;
        const doc = get('users', id).toArray();
        res.send({result: doc[0]});
    }
};
```



### Session Management

Foxx-Builder provides you with a generic Session Manager middleware that works via Headers Transport. To enable it, add the following lines into your index.js file:

```js
const sessions = require('./sessions/index');
sessions.init();
```

By default, only /login, /logout, and /password-recovery resources are available without authentication once Session Manager is enabled. If you want to add more endpoints, you can do it in the following way:  

```javascript
const sessions = require('./sessions/index');
sessions.allowedResources = [
    ...sessions.allowedResources,
    '/echo'
];
sessions.init();
```



## Integrations



### Proxying requests on Netlify 

#### netlify.toml example configuration

In case if you are using Netlify, here is the example for you how to proxy your URL API calls to ArangoDB Microservices.  

```toml
[build]
    base = "."
    publish = "./dist"
    functions = "netlify-functions/"

[[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200

[[redirects]]
    from = "/api/*"
    to = "http://{YOUR_HOSTNAME}:8529/_db/{YOUR_ENDPOINT}/api/:splat"
    status = 200
    force = true
    headers = {X-From = "Netlify"}

[[headers]]
    for = "/*"

    [headers.values]
        x-designed-by = "skitsanos, https://github.com/skitsanos"
```

Before deploying it on Netlify, make sure there are two variables replaced:

- {YOUR_HOSTNAME} - the hostname where ArangoDb is running
- {YOUR_ENDPOINT} - endpoint where your flex services are mounted

Also please refer to [Exposing Foxx to the browser](https://www.arangodb.com/docs/stable/foxx-guides-browser.html) on ArangoDB documentation web site.

