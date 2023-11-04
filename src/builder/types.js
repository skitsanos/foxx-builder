/**
 * @typedef {Object} AuthContext
 * @property {function(payload:Object):String} encode Encode payload
 * @property {function(tokeb:String):Object} decode Decode token
 * @property {function(token:String):Boolean} isExpired Check if token is expired
 */

/**
 * @typedef {Object} UtilsContext
 * @property {function(query:String):String} rxQuery AQL query builder
 * @property {function(email:String):Boolean} isEmail Check if string is valid email
 */

/**
 * Any truthy argument passed to the next function will be thrown as an error
 * @typedef {function(error?:any)} RouterNext
 */

/**
 * @typedef {function(req:EndpointRequest,res:EndpointResponse, next:RouterNext)} Router
 *
 */

/**
 * @typedef {Object} Endpoint
 * @property {function(name:String, schema?:Object, description?:String):Endpoint} queryParam Defines a query parameter
 *     recognized by the endpoint. Any additional non-defined query parameters are treated as optional string values.
 *     The definitions are also shown in the route details in the API documentation.
 * @property {function(name:String, schema?:Object, description?:String):Endpoint} pathParam Defines a path parameter
 *     recognized by the endpoint. The definitions are also shown in the route details in the API documentation.
 * @property {function(model?:Object, mimes?:String[], description?:String):Endpoint} body Defines the request body
 *     recognized by the endpoint. There can only be one request body definition per endpoint. The definition is also
 *     shown in the route details in the API documentation
 */

/**
 * @typedef {Object} FoxxServiceManifest
 * @property {String} author The full name of the author for the service (i.e., you). This is shown in the web
 *     interface.
 * @property {String[]} contributors A list of names, people that have contributed to the development of the service
 *     in some way. This is shown in the web interface.
 * @property {String} name The name of the service.
 * @property {String} description A human-readable description of the service. This is shown in the web interface.
 * @property {String} version The version of the service.
 * @property {String} defaultDocument If specified, the / (root) route of the service automatically redirects to the
 *     given relative path. As of ArangoDB 3.0.0 this field can safely be omitted; the value no longer defaults to
 *     "index.html"
 * @property {Object} configuration An object defining the configuration options this service requires.
 * @property {Object} dependencies An object mapping local aliases to dependency definitions. Each entry can be a
 *     dependency name and version range
 * @property {Object} engines An object indicating the semantic version ranges  of ArangoDB (or compatible
 *     environments) the service is compatible with
 * @property {Object} files An object defining file assets served by this service. Each entry can represent either a
 *     single file or a directory. When serving entire directories, the key acts as a prefix and requests to that
 *     prefix are resolved within the given directory
 * @property {String} lib The relative path to the Foxx JavaScript files in the service
 * @property {String} main The relative path to the main entry point of this service (relative to lib)
 * @property {Object} provides An object mapping dependency names to version ranges of that dependency provided by this
 *     service
 * @property {Object} scripts An object defining named scripts provided by this service, which can either be used
 *     directly or as queued jobs by other services
 */

/**
 * @typedef {function(query:String[],docVar?: String, textFields?:String[])} FilterBuilderFunction
 */

/**
 * @typedef {Object} QueriesUtils
 * @property {FilterBuilderFunction} filterBuilder AQL filter builder
 */

/**
 * @typedef {Object} ModuleContext
 * @property {any[]} argv Any arguments passed in if the current file was executed as a script or queued job.
 * @property {String} basePath The file system path of the service, i.e., the folder in which ArangoDB installed
 *     to the service.
 * @property {String} baseUrl The base URL of the service, relative to the ArangoDB server, e.g. /_db/_system/my-foxx.
 * @property {String} collectionPrefix The prefix that is used by collection and collectionName to derive the names of
 *     service-specific collections. This is derived from the service’s mount point, e.g. /my-foxx becomes my_foxx.
 * @property {String} mount The mount point of the service, relative to the ArangoDB server, e.g. /my-foxx.
 * @property {FoxxServiceManifest} manifest The parsed manifest file of the service.
 * @property {Object} configuration The configuration of the service.
 * @property {Object} dependencies The dependencies of the service.
 * @property {Boolean} isDevelopment Indicates whether the service is running in development mode.
 * @property {Boolean} isProduction Indicates whether the service is running in production mode.
 * @property {function(collection:String, documentId:String)} get Get a document from the collection
 * @property {function(collection:String, data:Object)} insert Insert a document into the collection
 * @property {function(collection:String, documentId:String, data:Object)} update Update a document in the collection
 * @property {function(collection:String, documentId:String)} remove Remove a document from the collection
 * @property {function(options:Object):Router} createDocumentationRouter Creates a router that serves the API
 *     documentation.
 * @property {function(name:String, encoding?:String):String|ArrayBuffer} file Passes the given name to fileName, then
 *     loads the file with the resulting name
 * @property {function(name:String):String} fileName Resolves the given file name relative to the current service
 * @property {function(router:Router):Endpoint} use Mounts a given router on the service to expose the router’s routes
 *     on the service’s mount point
 * @property {function(path?:String, router:Router):Endpoint} use Mounts a given router on the service to expose the
 *     router’s routes on the service’s mount point
 * @property {String} appRoot The path to the root directory of the application. This is the directory that contains
 *     the manifest file.
 * @property {AuthContext} auth
 * @property {UtilsContext} utils
 */

/**
 * @typedef {Object} module
 * @property {ModuleContext} context
 * @exports module
 */

//--------------------------------------------

/**
 * @typedef {Object} EndpointHandlerBody
 * @property {Object} model The Joi schema of the body.
 * @property {String[]} mimes The allowed mime types of the body.
 * @property {String} description The description of the body.
 */

/**
 * @typedef {Object} EndPointHandlerError
 * @property {String} code The error code.
 * @property {String} description The error description. A human-readable string that is shown in the API
 *     documentation.
 * @property {function(status:String|Number, model?:Object, mimes?:String[], description:String)} response defines a
 *     response body for the endpoint. When using the response object’s send method in the request handler of this
 *     route, the definition with the matching status code is used to generate the response body. The definitions are
 *     also shown in the route details in the API documentation.
 * @property {String} summary Adds a short description to the endpoint’s API documentation.
 */

/**
 * @typedef {Object} EndpointRequest
 * @property {String} method The HTTP verb used to make the request, e.g. "GET"
 * @property {String} url TThe URL of the request.
 * @property {String} originalUrl Root-relative URL of the request, i.e., path followed by the raw query parameters, if
 *     any.
 * @property {String} path Database-relative path of the request URL (not including the query parameters).
 * @property {Object} pathParams An object mapping the names of path parametersfor the current route to their validated
 *     values.
 * @property {Object} queryParams An object mapping the names of query parameters for the current route to their
 *     validated values.
 * @property {Object} body The request body.
 * @property {String} database The name of the database in which the request is being handled, e.g. "_system".
 * @property {Object} headers The request headers.
 * @property {Object} hostname The hostname (domain name) indicated in the request headers.
 * @property {Number} port The port indicated in the request headers.
 * @property {String} remoteAddress The IP of the client that made the request.
 * @property {String[]} remoteAddresses A list containing the IP addresses used to make the request.
 * @property {Number} remotePort The listening port of the client that made the request.
 * @property {Boolean} secure Whether the request was made over a secure connection (i.e., HTTPS).
 * @property {Boolean} trustProxy ndicates whether the request was made using a trusted proxy. If the origin server’s
 *     address was specified in the ArangoDB configuration using --web interface.trusted-proxy or the service’s
 *     trustProxy setting is enabled, this is true, otherwise it is false.
 * @property {Boolean} xhr Whether the request indicates it was made within a browser using AJAX.
 */

/**
 * @typedef {Object} EndpointResponse
 * @property {function(data:Object):void} json Sets the response body to the JSON string value of the given data.
 * @property {function(status:Number|String):void} status Sets the response status to the given status code.
 * @property {function(status:Number|String)} sendStatus Sends a plaintext response for the given status code. The
 *     response status is set to the given status code; the response body is set to the status message corresponding to
 *     that status code.
 * @property {function(data:any, type:String?):void} send Sets the response body to the given data with respect to the
 *     response definition for the response’s current status code.
 * @property {function(filename:String?)} attachment Sets the content-disposition header to indicate the response is a
 *     downloadable file with the given name. Note: This does not modify the response body or access the file
 *     system. To send a file from the file system, see the download or sendFile methods.
 * @property {function(name:String, value:String, options:Object?)} cookie Sets a cookie with the given name.
 * @property {function(path:String, filename:String)} download The equivalent of calling
 *     res.attachment(filename).sendFile(path).
 * @property {function(path:String, options:Object?):void} sendFile Sends a file from the local filesystem as the
 *     response body.
 *
 * @property {function(status:Number|String, reason?:String, options?:Object):void} throw Throw error
 *
 * @property {function(status: Number|String|Number, path: String):void} redirect Redirects the response by setting the
 *     status code and location path.
 * @property {function(status:String):void} redirect Redirects the response by setting the response location header and
 *     status code.
 * @property {function(name:String, value:String)} setHeader Sets the value of the header with the given name.
 * @property {function(name:String, value:String)} set Sets the value of the header with the given name.
 * @property {function(headers:Object)} set Sets the value of the header with the given name.
 * @property {function(name:String)} removeHeader Removes the header with the given name.
 * @property {function(type:String)} type Sets the response content-type to the given type if provided or returns the
 *     previously set content-type.
 * @property {function(data:String|ArrayBuffer)} write Appends the given data to the response body.
 */

/**
 * @typedef {Object} EndpointHandler
 * @property {function(request:EndpointRequest, response:EndpointResponse):void} handler The handler function of the
 *     endpoint. It receives the request and response objects as arguments.
 * @property {String} name The name of the endpoint.
 * @property {String} contentType The content type of the endpoint’s responses.
 * @property {EndpointHandlerBody} body The body definition of the endpoint.
 * @property {EndPointHandlerError[]} error The error definitions of the endpoint.
 */