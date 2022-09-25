import {
    AbstractServer,
    IServerConfig,
} from '../src/abstract-server';
import {
    RequestMethod,
    Query,
    Params,
    Body,
    Headers,
    RequestHandlerInternal,
    RequestHandlerParams,
} from '../src/request';
import { IRoute } from '../src/route';

/* Abstract implementation of the routes and the handling. This class does not depend on a specific framework. */
export abstract class AppServer extends AbstractServer {
    /* Define all routes required by the App and the handlers which do the logical processing. */
    protected _defineRoutes(): IRoute[] {
        return [{
            method: RequestMethod.GET,
            route: '/hello', /* Listen to /hello. */
            handler: this._getHelloHandler, /* Use a single request handler. */
            children: [{
                route: '/world', /* Listen to /hello/world. */

                /* Use several request handlers. The second one is only executed if the first one succeeds. */
                handler: [this._getHelloHandler, this._getWorldHandler],
            }, {
                route: '/:value', /* Listen to /hello/:value. */

                /* Use several request handlers. The second one is only executed if the first one succeeds. */
                handler: [this._getHelloHandler, this._getValueHandler],
            }]
        }] as IRoute[];
    }

    protected abstract _getMethod(...args: unknown[]): RequestMethod | null;
    protected abstract _getQuery(...args: unknown[]): Query;
    protected abstract _getPath(...args: unknown[]): string;
    protected abstract _getParams(...args: unknown[]): Params;
    protected abstract _getBody(...args: unknown[]): Body;
    protected abstract _getHeaders(...args: unknown[]): Headers
    protected abstract _sendResponse(error: string | null, params: RequestHandlerParams, ...args: unknown[]): Promise<void>;
    protected abstract _connect(config?: IServerConfig | undefined): Promise<void>;
    protected abstract _disconnect(): Promise<void>;
    protected abstract _transformPath(path: string): string;
    protected abstract _addRoute(method: RequestMethod, route: string, handler: RequestHandlerInternal): Promise<boolean>;

    private _getHelloHandler(params: RequestHandlerParams): Promise<void> {
        const responseParams = params.response;

        responseParams.body = ['Hello']; /* Set body as array. */
        responseParams.status = 200;

        return Promise.resolve();
    }

    private _getWorldHandler(params: RequestHandlerParams): Promise<void> {
        const responseParams = params.response;

        /* Append to previously defined body array. */
        (responseParams.body as unknown[]).push('World');
        responseParams.status = 200;

        return Promise.resolve();
    }

    private _getValueHandler(params: RequestHandlerParams): Promise<void> {
        const responseParams = params.response;

        /* Append to previously defined body array. */
        (responseParams.body as unknown[]).push(parseInt(params.request.params.value as string));
        responseParams.status = 200;

        return Promise.resolve();
    }
}
