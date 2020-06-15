# foxx-builder
> ArangoDB allows application developers to write their data access and domain logic as microservices running directly within the database with native access to in-memory data. The **Foxx microservice framework** makes it easy to extend ArangoDB’s own REST API with custom HTTP endpoints using modern JavaScript running on the same V8 engine you know from Node.js and the Google Chrome web browser.
>
> Unlike traditional approaches to storing logic in the database (like stored procedures), these microservices can be written as regular structured JavaScript applications that can be easily distributed and version controlled. Depending on your project’s needs Foxx can be used to build anything from optimized REST endpoints performing complex data access to entire standalone applications running directly inside the database.
>
> -- [Foxx Microservices](https://www.arangodb.com/docs/stable/foxx.html)

The idea behind this template is to help developers create and run ArangoDB Foxx Microservices with minimal effort and at no time by keeping each API endpoint method handler in its dedicated module. 

So, instead of having complex logic describing complete API endpoint functionality, we split it into smaller blocks that are easier to maintain and provide a better overview of the whole application.

### Getting started

Just `git clone` the whole thing, and you are good to go.

```sh
git clone https://github.com/skitsanos/foxx-builder.git
```

### Folder Structure

There are very few bits required to make your foxx services up and running. The folder structure defined in a way that will help you to have better control over API application architecture with a minimal coding effort from your side.

```
/builder
/foxx
manifest.json
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
/foxx
  /echo
    all.js
```

Another example - we need to add a ```/api/users``` route that on _GET_ method will reply with some data and on _POST_ will accept data sent to API and then respond.

```
/foxx
  /echo
    all.js
  /users
    get.js
    post.js
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

More on path parameters you can read on [https://www.arangodb.com/docs/stable/foxx-getting-started.html#parameter-validation](https://www.arangodb.com/docs/stable/foxx-getting-started.html#parameter-validation).