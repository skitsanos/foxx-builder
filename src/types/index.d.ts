// Type definitions for Foxx Builder

/**
 * Module context with extensions
 */
declare namespace FoxxBuilder {
  /**
   * Authentication context for JWT tokens
   */
  interface AuthContext {
    /**
     * Encode payload into JWT token
     * @param payload - payload to encode
     * @param options - encoding options
     */
    encode(payload: object, options?: object): string;
    
    /**
     * Decode JWT token
     * @param token - JWT token
     * @param options - decoding options
     */
    decode(token: string, options?: object): object;
    
    /**
     * Check if token is expired
     * @param tokenOrPayload - JWT token or decoded payload
     */
    isExpired(tokenOrPayload: string | object): boolean;

    /**
     * Create refresh token
     * @param userId - User ID
     * @param extraData - Additional data
     */
    createRefreshToken(userId: string, extraData?: object): string;

    /**
     * Refresh access token
     * @param refreshToken - Refresh token
     * @param options - Refresh options
     */
    refreshAccessToken(refreshToken: string, options?: object): { accessToken: string, refreshToken?: string };

    /**
     * Validate token
     * @param token - JWT token
     * @param options - Validation options
     */
    validateToken(token: string, options?: object): string;

    /**
     * Create authentication middleware
     * @param options - Middleware options
     */
    createMiddleware(options?: object): (req: EndpointRequest, res: EndpointResponse, next: RouterNext) => void;

    /**
     * Check if token expiration is enabled
     */
    useTokenExpiration(): boolean;

    /**
     * Check if refresh tokens are enabled
     */
    useRefreshTokens(): boolean;
  }

  /**
   * Utility functions context
   */
  interface UtilsContext {
    /**
     * Check if string is valid email
     * @param email - Email to check
     */
    isEmail(email: string): boolean;
    
    /**
     * Build AQL filter
     * @param query - Query parameters
     * @param doc - Document variable name
     */
    filterBuilder(query: any[], doc?: string): any;
    
    /**
     * Create AQL filter
     * @param query - Query parameters
     * @param doc - Document variable name
     */
    filter(query: any[], doc?: string): any;
    
    /**
     * Create AQL query using rxQuery syntax
     * @param query - Query string
     * @param doc - Document variable name
     */
    rxQuery(query: string, doc?: string): any;
  }

  /**
   * Router next function
   * @param error - Optional error to throw
   */
  type RouterNext = (error?: any) => void;

  /**
   * Router function
   */
  type Router = (req: EndpointRequest, res: EndpointResponse, next: RouterNext) => void;

  /**
   * Endpoint handler
   */
  interface Endpoint {
    /**
     * Define query parameter
     * @param name - Parameter name
     * @param schema - Schema
     * @param description - Description
     */
    queryParam(name: string, schema?: object, description?: string): Endpoint;
    
    /**
     * Define path parameter
     * @param name - Parameter name
     * @param schema - Schema
     * @param description - Description
     */
    pathParam(name: string, schema?: object, description?: string): Endpoint;
    
    /**
     * Define request body
     * @param model - Body model
     * @param mimes - MIME types
     * @param description - Description
     */
    body(model?: object, mimes?: string[], description?: string): Endpoint;

    /**
     * Define error response
     * @param status - HTTP status code
     * @param message - Error message
     */
    error(status: number, message: string): Endpoint;
  }

  /**
   * Foxx service manifest
   */
  interface FoxxServiceManifest {
    author: string;
    contributors?: string[];
    name: string;
    description?: string;
    version: string;
    defaultDocument?: string;
    configuration?: object;
    dependencies?: object;
    engines?: object;
    files?: object;
    lib?: string;
    main: string;
    provides?: object;
    scripts?: object;
  }

  /**
   * Filter builder function
   */
  type FilterBuilderFunction = (query: string[], docVar?: string, textFields?: string[]) => [string[], object];

  /**
   * Query utilities
   */
  interface QueriesUtils {
    filterBuilder: FilterBuilderFunction;
  }

  /**
   * Request body definition
   */
  interface EndpointHandlerBody {
    model: object;
    mimes?: string[];
    description?: string;
  }

  /**
   * Error handler definition
   */
  interface EndPointHandlerError {
    code: string;
    description: string;
    response(status: string | number, model?: object, mimes?: string[], description?: string): void;
    summary?: string;
  }

  /**
   * Request object
   */
  interface EndpointRequest {
    method: string;
    url: string;
    originalUrl: string;
    path: string;
    pathParams: object;
    queryParams: object;
    body: any;
    database: string;
    headers: object;
    hostname: string;
    port: number;
    remoteAddress: string;
    remoteAddresses: string[];
    remotePort: number;
    secure: boolean;
    trustProxy: boolean;
    xhr: boolean;
    userId?: string;
    user?: object;
    token?: object;
    auth?: object;
  }

  /**
   * Response object
   */
  interface EndpointResponse {
    json(data: object): void;
    status(status: number | string): void;
    sendStatus(status: number | string): void;
    send(data: any, type?: string): void;
    attachment(filename?: string): void;
    cookie(name: string, value: string, options?: object): void;
    download(path: string, filename: string): void;
    sendFile(path: string, options?: object): void;
    throw(status: number | string, reason?: string, options?: object): void;
    redirect(status: number | string | number, path: string): void;
    setHeader(name: string, value: string): void;
    set(name: string, value: string): void;
    set(headers: object): void;
    removeHeader(name: string): void;
    type(type: string): string;
    write(data: string | ArrayBuffer): void;
  }

  /**
   * Endpoint handler definition
   */
  interface EndpointHandler {
    handler: (request: EndpointRequest, response: EndpointResponse) => void;
    name?: string;
    contentType?: string;
    body?: EndpointHandlerBody;
    error?: EndPointHandlerError[];
    params?: {
      path?: object;
      query?: object;
    };
    headers?: object;
  }

  /**
   * Module context
   */
  interface ModuleContext {
    argv?: any[];
    basePath: string;
    baseUrl: string;
    collectionPrefix: string;
    mount: string;
    manifest: FoxxServiceManifest;
    configuration: object;
    dependencies: object;
    isDevelopment: boolean;
    isProduction: boolean;
    get(collection: string, documentId: string): any;
    insert(collection: string, data: object): any;
    update(collection: string, documentId: string, data: object): any;
    remove(collection: string, documentId: string): any;
    createDocumentationRouter(options: object): Router;
    file(name: string, encoding?: string): string | ArrayBuffer;
    fileName(name: string): string;
    use(path: string | Router, router?: Router): Endpoint;
    appRoot: string;
    auth: AuthContext;
    utils: UtilsContext;
    queries: QueriesUtils;
    runTask(name: string, handler: string, params: object, period?: number): void;
    jobs: {
      run(scriptName: string, data: object, opts?: object): string;
      abort(jobId: string, withRemove?: boolean): void;
    };
  }
}

/**
 * Module object with context
 */
declare interface Module {
  context: FoxxBuilder.ModuleContext;
  exports: any;
}

/**
 * Global module variable
 */
declare const module: Module;

// Make these types available globally
type AuthContext = FoxxBuilder.AuthContext;
type UtilsContext = FoxxBuilder.UtilsContext;
type RouterNext = FoxxBuilder.RouterNext;
type Router = FoxxBuilder.Router;
type Endpoint = FoxxBuilder.Endpoint;
type FoxxServiceManifest = FoxxBuilder.FoxxServiceManifest;
type FilterBuilderFunction = FoxxBuilder.FilterBuilderFunction;
type QueriesUtils = FoxxBuilder.QueriesUtils;
type EndpointHandlerBody = FoxxBuilder.EndpointHandlerBody;
type EndPointHandlerError = FoxxBuilder.EndPointHandlerError;
type EndpointRequest = FoxxBuilder.EndpointRequest;
type EndpointResponse = FoxxBuilder.EndpointResponse;
type EndpointHandler = FoxxBuilder.EndpointHandler;
type ModuleContext = FoxxBuilder.ModuleContext;
