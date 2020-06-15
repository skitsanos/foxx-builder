# foxx-builder
The idea behind this template is to help developers create and run ArangoDB Foxx Services with minimal effort and at no time by keeping each API endpoint method handler in its dedicated module. 

So, instead of having complex logic describing complete API endpoint functionality, we split it into smaller blocks that are easier to maintain and provide a better overview of the whole application.

### Folder structure

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
