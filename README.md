# foxx-builder
[![CircleCI](https://dl.circleci.com/status-badge/img/gh/skitsanos/foxx-builder/tree/master.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/skitsanos/foxx-builder/tree/master)
> ArangoDB allows application developers to write their data access and domain logic as microservices running directly within the database with native access to in-memory data. The **Foxx microservice framework** makes it easy to extend ArangoDB’s own REST API with custom HTTP endpoints using modern JavaScript running on the same V8 engine you know from Node.js and the Google Chrome web browser.
>
> Unlike traditional approaches to storing logic in the database (like stored procedures), these microservices can be written as regular structured JavaScript applications that can be easily distributed and version controlled. Depending on your project’s needs, Foxx can be used to build anything from optimized REST endpoints performing complex data access to entire standalone applications running directly inside the database.
>
> -- [Foxx Microservices](https://www.arangodb.com/docs/stable/foxx.html)

The idea behind this template is to help developers create and run ArangoDB Foxx Microservices with minimal effort and at no time by keeping each API endpoint method handler in its dedicated module.

So, instead of having complex logic describing complete API endpoint functionality, we split it into smaller blocks that are easier to maintain and provide a better overview of the whole application.

### Getting started

1. `git clone` the whole thing, and you are good to go.

```sh
git clone https://github.com/skitsanos/foxx-builder.git
```

In the `package.json` in the *scripts* section, you will find a number of shortcuts that will help you register your server with `foxx-cli`, and install or replace the Foxx microservice on your server.

2. Install `foxx-cli` if you don't have it yet [https://github.com/arangodb/foxx-cli#install](https://github.com/arangodb/foxx-cli#install)

3. Register your ArangoDB server so you can install and replace your Foxx Microservices, for example:

   ```sh
   foxx server set dev http://dev:sandbox@localhost:8529
   ```

By executing this command, we assume that you already created a user _dev_ with password _sandbox_ on _localhost_ server, and we register this server to foxx-cli as _dev_.

If you define servers using the `server` commands, a `.foxxrc` file will be created in your `$HOME` directory, which is typically one of the following paths:

- `/home/$USER` on Linux
- `/Users/$USER` on macOS
- `C:\Users\$USER` on Windows

This file contains sections for each server that may contain server credentials should you decide to save them.

4. The example below shows how you can install this Foxx Microservice on the _dev_ server to the _dev_ database and mount it as _/api_ endpoint.

   ```sh
   foxx install /api . --server dev --database dev
   ```

### Folder Structure

There are very few bits required to make your Foxx services up and running. The folder structure is defined in a way that will help you to have better control over API application architecture with minimal coding effort from your side.

```
src/
--/builder/
---- context-extensions.js
---- index
--/routes/
-- index.js
-- setup.js
manifest.json
package.json
```

_/builder_ is the actual Foxx Builder service with all its utils. Unless you want to modify how `foxx-builder` works, you don't need to touch it.

_/routes_ is the folder where you will create your API service handlers with the convention described below;

_manifest.json_ is a Service Manifest file, as described on https://www.arangodb.com/docs/stable/foxx-reference-manifest.html;

setup.js - Setup script, as described on https://www.arangodb.com/docs/stable/foxx-guides-scripts.html#setup-script;

Inside the _/foxx_ folder will be placed API endpoint path handlers, where every part of the path will be correspondent to a dedicated folder that contains an HTTP method handler.

Out of the box, _foxx builder_ supports the following HTTP methods:
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
/routes/
-- /echo/
---- all.js
```

Another example - we need to add a ```/api/users``` route that on _GET_ method will reply with some data and on _POST_ will accept data sent to API and then respond.

```
/routes
-- /echo
---- all.js
-- /users
---- post.js
---- post.js
```

In other words, file path your API route method handler mirrors your URL path

| **API endpoint**                 | **Handler**                       |
| -------------------------------- | --------------------------------- |
| GET /api/echo                    | /api/echo/post.js                  |
| GET /api/users                   | /api/users/post.js                 |
| POST /api/users                  | /api/users/post.js                |
| GET /api/users/_:id_/tasks       | /api/users/$id/tasks/post.js       |
| GET /api/users/_:id_/tasks/:task | /api/users/$id/tasks/$task/post.js |

### Parametrized path

Adding parameters to your URL point handling is pretty simple. Probably, you already noticed from the table above when we require some parameter; we just add its name with $ in front of it in our folder name. Just make sure you don't have duplicating parameters.

| **API endpoint**                 | **Handler**                       |
| -------------------------------- | --------------------------------- |
| GET /api/users/_:id_/tasks/:task | /api/users/$id/tasks/$task/post.js |

```
/routes/
-- /users/
---- post.js
---- post.js
---- /$id/
------ post.js
------/tasks/
-------- post.js
-------- post.js
-------- /$task/
---------- post.js
```

More on path parameters you can be read on [https://www.arangodb.com/docs/stable/foxx-getting-started.html#parameter-validation](https://www.arangodb.com/docs/stable/foxx-getting-started.html#parameter-validation).

### Validating payload sent to your endpoint

For HTTP methods like POST and PUT, you need to add to your handler additional property called `body`. If it is set to `null`, the request payload will be rejected. If you want to enable request body/payload validation, you need to set `body` property with at least adding schema to it.

The `body` defines the request body recognized by the endpoint. There can only be one request body definition per endpoint. The definition will also be shown in the route details in ArangoDB's API documentation.

In the absence of a request body definition, the request object’s *body* property will be initialized to the unprocessed *rawBody* buffer.

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

  Common non-mime aliases like “json” or “html” are also supported and will be expanded to the appropriate MIME type (e.g., “application/json” and “text/html”).

  If the MIME type is recognized by Foxx, the request body will be parsed into the appropriate structure before being validated. Currently, only JSON, `application/x-www-form-urlencoded` and multipart formats are supported.

  If the MIME type indicated in the request headers does not match any of the supported MIME types, the first MIME type in the list will be used instead.

  Failure to parse the request body will result in an automatic 400 (Bad Request) error response.

- **description**: `string` (optional)

  A human-readable string will be shown in the API documentation.

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
- `runScript(scriptName, params)` - launches task with the script defined in `manifest.json, Takes _scriptName_ and _params_ as arguments.

**Using context utils**

```javascript
//users/$id/post.js

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



**Using context utility runScript to send a message into Telegram Channel**

The example below demonstrates how to send a message to Telegram Channel. Once we have our Telegram Bot token and Channel Id, we add into the scripts folder this piece of code:

```javascript
//scripts/telegram_chat_message.js

const request = require('@arangodb/request');

const {argv} = module.context;

const token = module.context.configuration.telegramToken;

request.post(`https://api.telegram.org/bot${token}/sendMessage`, {
  json: true,
  body: argv[0]
});

module.exports = true;
```

Now we can call it, for exmaple, from our middleware:

```javascript
module.context.use((req, res, next) =>
{
  const {runScript} = module.context;
  runScript('telegram_chat_message', {
    chat_id: '-CHANNEL_ID',
    text: 'hi there from runScript'
  });

  next();
});
```

Now, on every request, we will receive a message on our Telegram Channel. You can use it, for example, for logging into the channel any debug data or stack trace from exceptions fired by your API. Telegram `sendMessage` params are documented on the [Telegram Bot API](https://core.telegram.org/bots/api#sendmessage) web page.

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

## Developing on Docker

> More detailed information on this topic is available on the [Running in Docker](https://github.com/skitsanos/foxx-builder/wiki/Running-in-Docker) Wiki page

In `Foxx-builder` v.2.x, we added `docker-compose.yml` file and a few shortcuts into `package.json` that will help you to develop your APIs and run them in docker. You can use `npm` or `yarn` to run 'shortcuts' instead of typing the whole command line yourself; just keep in mind that there is an order of actions to take into consideration,

The flow would be like this:

1. Start docker container: `yarn run docker:start`
2. Setup the development database `yarn run docker:setup-db`
3. Register development database server with Foxx CLI `yarn run register-foxx-dev-server`
4. Install Foxx Microservices on `/api` endpoint on development database `yarn run install-foxx-dev`

After microservices are installed, during the development, all you will need to call is a `replace` method - `yarn run replace-foxx-dev`



## Testing Foxx Services APIs

You use [Hurl](https://hurl.dev) to test your API endpoints.

> Hurl is a command-line tool that runs **HTTP requests** defined in a simple **plain text format**.
>
> It can perform requests, capture values, and evaluate queries on headers and body responses. Hurl is very versatile: it can be used for both **fetching data** and **testing HTTP** sessions.

There are two ways you can run hurl tests, - via the docker container or by having hurl installed.

Testing with `hurl` running in docker:

```shell
docker run --network host --rm -it -v "$(pwd)/.api-test":/app "orangeopensource/hurl:latest" --test --variables-file /app/.vars /app/hello.hurl
```

Or, if you already have to `hurl` installed ([Installation instructions](https://hurl.dev/docs/installation.html))

```shell
hurl --test --variables-file .api-test/.vars .api-test/*.hurl
```

`.vars` file contains variables needed for your tests and can look like this:

```
URL=http://localhost:8529/_db/dev/api
```

So, all together with variables, you can make an API test that will check if your API is up:

```
GET {{URL}}/

HTTP/* 200
```

The `{{URL}}` referres to `URL` variable from `.vars` file.



## Integrations

### Proxying requests on Netlify

> More detailed information on this topic is available on the [Working with Netlify](https://github.com/skitsanos/foxx-builder/wiki/Working-with-Netlify) Wiki page

#### netlify.toml example configuration

If you are using Netlify, here is an example of how to proxy your URL API calls to ArangoDB Microservices.

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
to = "http://{YOUR_HOSTNAME}:8529/_db/{YOUR_DATABASE}/{YOUR_ENDPOINT}/:splat"
status = 200
force = true
headers = {X-From = "Netlify"}

[[headers]]
for = "/*"

[headers.values]
x-designed-by = "skitsanos, https://github.com/skitsanos"
```

Before deploying it on Netlify, make sure there are two variables replaced:

- `{YOUR_HOSTNAME}` - the hostname where ArangoDb is running
- `{YOUR_DATABASE}` - ArangoDB database name where the Foxx service is installed
- `{YOUR_ENDPOINT}` - endpoint where your flex services are mounted

Also, please refer to [Exposing Foxx to the browser](https://www.arangodb.com/docs/stable/foxx-guides-browser.html) on the ArangoDB documentation website.

