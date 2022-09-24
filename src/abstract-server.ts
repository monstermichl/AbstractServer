import {
    Params,
    Query,
    RequestHandler,
    RequestHandlerInternal,
    RequestMethod,
} from './request';
import { IRoute } from './route';

type CalloutMap = {[key in RequestMethod]?: {[path: string]: RequestHandlerInternal}};

export enum RequestProcessingResult {
    Ok,
    NoMethod,
    NoOriginalPath,
    NoCallout,
    NoCalloutPromise,
    CalloutFailed,
    Unknown,
}

export interface IServer {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}

export abstract class AbstractServer implements IServer {
    protected abstract _PORT: number;

    private _connected = false;
    private _routesInitialized = false;
    private _calloutMap: CalloutMap = {};

    /**
     * Starts the server (and if not done yet, configures the routes).
     * @returns Void Promise.
     */
    async connect(): Promise<void> {
        let result;

        if (!this._connected) {
            /* Initialize routes if not done yet. */
            if (!this._routesInitialized) {
                /* All routes are defined here. */
                const routes: IRoute[] = this._defineRoutes();

                if (await this._addRoutes(routes)) {
                    result = Promise.resolve();
                }
                this._routesInitialized = true;
            } else {
                result = Promise.resolve();
            }
        }
        return (result && this._connect(this._PORT).then(() => { this._connected = true; })) || Promise.reject();
    }

    /**
     * Stops the server.
     * @returns Void Promise.
     */
    disconnect(): Promise<void> {
        return this._disconnect().then(() => { this._connected = false; });
    }

    protected _prepareParam(arg: string): string {
        return `{${arg}}`;
    }

    /**
     * Returns the routes which shall be handled.
     */
    protected abstract _defineRoutes(): IRoute[];

    /**
     * Adds a new route.
     * 
     * @param route Route to add.
     * @return Boolean Promise.
     */
     protected async _addRoutes(route: IRoute): Promise<boolean>;

    /**
     * Adds new routes.
     * 
     * @param routes Routes to add.
     * @return Boolean Promise.
     */
     protected async _addRoutes(routes: IRoute[]): Promise<boolean>;
     protected async _addRoutes(arg: unknown): Promise<boolean> {
        let result;

        if (arg instanceof Array) {
            let addResult = true;

            /* Use usual for-loop since async await is not possible in forEach. */
            for (let i = 0; (i < arg.length) && addResult; ++i) {
                addResult = await this._addRouteInternal(arg[i]);
            }
            result = Promise.resolve(addResult);
        } else {
            result = this._addRouteInternal(arg as IRoute);
        }
        return result;
    }

    /**
     * Gets the request method from the server implementation (e.g. Express).
     * 
     * @param args All request handler args provided by the server implementation
     *             (e.g. Express). E.g. req, res, next.
     */
    protected abstract _getMethod(...args: unknown[]): RequestMethod | null;

    /**
     * Gets the query params from the server implementation (e.g. Express). E.g.
     * x=1&y=2 -> { x: 1, y: 2 }
     * 
     * @param args All request handler args provided by the server implementation
     *             (e.g. Express). E.g. req, res, next.
     */
    protected abstract _getQuery(...args: unknown[]): Query;

    /**
     * Gets the requested path from the server implementation (e.g. Express). E.g.
     * /product/1
     * 
     * @param args All request handler args provided by the server implementation
     *             (e.g. Express). E.g. req, res, next.
     */
    protected abstract _getPath(...args: unknown[]): string;

    /**
     * Gets the params from the server implementation (e.g. Express). E.g.
     * /products/{id} -> { id: 1 }
     * 
     * @param args All request handler args provided by the server implementation
     *             (e.g. Express). E.g. req, res, next.
     */
    protected abstract _getParams(...args: unknown[]): Params;

    /**
     * Gets the body data from the server implementation (e.g. Express).
     * 
     * @param args All request handler args provided by the server implementation
     *             (e.g. Express). E.g. req, res, next.
     */
    protected abstract _getBody(...args: unknown[]): Body;

    /**
     * Sends a HTTP response via the server implementation (e.g. Express).
     * 
     * @param result   RequestProcessingResult.
     * @param response Response data (can be null).
     * @param args     All request handler args provided by the server implementation
     *                 (e.g. Express). E.g. req, res, next.
     * 
     * @return Void Promise.
     */
    protected abstract _sendResponse(result: RequestProcessingResult, response: unknown, ...args: unknown[]): Promise<void>;

    /**
     * Starts the server.
     * @param port Port to listen to.
     */
    protected abstract _connect(port: number): Promise<void>;

    /**
     * Stops the server.
     */
    protected abstract _disconnect(): Promise<void>;

    /**
     * Replaces the Server-class specific placeholders with placeholders of
     * the actual server implementation (e.g. Express).
     * E.g. /product/{id} -> /product/:id
     * 
     * @param path Path specified by an IRoute object. E.g. /product/{id}.
     * @return Transformed path.
     */
    protected abstract _transformPath(path: string): string;

    /**
     * Adds a route to which the server (e.g. Express) reacts to on a request.
     * 
     * @param method HTTP method (GET, POST, PATCH, DELETE).
     * @param route Route to handle.
     * @param handler Handler which shall be called on a request.
     */
    protected abstract _addRoute(method: RequestMethod, route: string, handler: RequestHandler): Promise<boolean>;

    /**
     * Internal helper function to add a route.
     * 
     * @param route Route to add.
     * @param preRoutes Helper variable to handle nested routes.
     * 
     * @returns Promise which returns rue if all requested routes were
     *          added successfully, otherwise it returns false.
     */
    private async _addRouteInternal(route: IRoute, preRoutes = ''): Promise<boolean> {
        let result;

        if (route) {
            const fixSlashes = (s: string) => s.replace(/(^\/+)/, '')
                                               .replace(/(\/+$)/, '')
                                               .replace(/\/+/g, '/'); /* Trim leading, trailing and doubles slashes. */
            
            /* Cleanup routes. */
            preRoutes = fixSlashes(preRoutes);
            const routeString = `/${preRoutes ? preRoutes + '/' : ''}${fixSlashes(route.route)}`;

            /* Handle route only if a route-handler is provided. */
            if (route.handler) {
                /* Add route. */
                result = this._addRoute(route.method, this._transformPath(routeString), this._requestHandler);

                /* Make sure, method is set in callout map if not done yet. */
                if (!(route.method in this._calloutMap)) {
                    this._calloutMap[route.method] = {}
                }

                const pathMap = this._calloutMap?.[route.method];

                /* Make sure, path-map is valid (this check if useless since the index
                    is assigned within the check before. But it's required to make
                    Typescript happy). */
                if (pathMap) {
                    pathMap[routeString] = route.handler;
                }
            }

            /* If route has children, process them. */
            if (route.children?.length) {
                let addResult = true;

                /* Use usual for-loop since async await is not possible in forEach. */
                for (let i = 0; (i < route.children.length) && addResult; ++i) {
                    const child = route.children[i];

                    addResult = await this._addRouteInternal({
                        method: route.method,
                        route: child.route,
                        handler: child.handler,
                        children: child.children,
                    } as IRoute, routeString);
                }
                result = Promise.resolve(addResult);
            }
        }
        return result || Promise.reject();
    }

    /**
     * Tries to recreate the original path from the actually requested path.
     * E.g. /products/1 -> /products/{id}
     * 
     * @param path Path provided by the server implementation (e.g. Express). E.g. /products/1
     * @param params Params provided by the server implementation (e.g. Express). E.g. { id: 1 }
     * 
     * @returns Recreated original path.
     */
    private _getOriginalPath(path: string, params: Params): string {
        let originalPath = path;

        /* This method works only if the dictionary is in the same
           order as the original parameter definition. */
        Object.entries(params).forEach(([key, value]) => {
            /* Replace the first appearance of the value. */
            originalPath = originalPath.replace(`${value}`, this._prepareParam(key));
        });
        return originalPath;
    }

    /**
     * Handles all requests coming from the actual server implementation (e.g. Express).
     * 
     * @param args All request handler args provided by the server implementation
     *             (e.g. Express). E.g. req, res, next.
     * 
     * @returns Void Promise.
     */
    private _requestHandler = async (...args: unknown[]): Promise<void> => { /* Request handler must be an arrow function to preserve this-context. */
        const method = this._getMethod(...args);
        const path = this._getPath(...args);
        const params = this._getParams(...args);
        const queryParams = this._getQuery(...args);
        const body = this._getBody(...args);
        const originalPath = this._getOriginalPath(path, params);
        const sendFailure = (processingResult: RequestProcessingResult) => this._sendResponse(processingResult, null, ...args);
        let processingResult = RequestProcessingResult.Unknown;
        let result;

        if (!method) {
            /* Without a method, no callout mapping is possible. */
            processingResult = RequestProcessingResult.NoMethod;
        } else if (!originalPath) {
            /* Without a path, no callout mapping is possible. */
            processingResult = RequestProcessingResult.NoOriginalPath;
        } else if(!this._calloutMap?.[method]?.[originalPath]) {
            /* Without a defined callout, no callout mapping is possible. */
            processingResult = RequestProcessingResult.NoCallout;
        } else {
            result = new Promise<void>((resolve) => {
                const callout = this._calloutMap[method]?.[originalPath](path, params, queryParams, body);

                if (callout) {
                    callout
                        .then((calloutResult) => this._sendResponse(RequestProcessingResult.Ok, calloutResult, ...args))
                        .then(() => resolve())
                        .catch(() => sendFailure(RequestProcessingResult.CalloutFailed).then(() => resolve()));
                } else {
                    sendFailure(RequestProcessingResult.NoCalloutPromise).then(() => resolve());
                }
            });
        }
        return result || sendFailure(processingResult);
    }
}
