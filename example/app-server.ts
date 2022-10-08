/* <ignore-in-readme> */
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
    HeaderValue,
    RequestHandlerRequest,
    RequestHandlerResponse,
    RequestHandlerInfo,
} from '../src/request';
import { IRoute } from '../src/route';
/* <dont-ignore-in-readme> */

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
    protected abstract _setHeader(header: string, value: HeaderValue, ...args: unknown[]): boolean;
    protected abstract _setStatus(status: number, ...args: unknown[]): boolean;
    protected abstract _send(body?: Body, ...args: unknown[]): Promise<void>;
    protected abstract _connect(config?: IServerConfig | undefined): Promise<void>;
    protected abstract _disconnect(): Promise<void>;
    protected abstract _transformPath(path: string): string;
    protected abstract _addRoute(method: RequestMethod, route: string, handler: RequestHandlerInternal): Promise<boolean>;

    private _getHelloHandler(_: RequestHandlerRequest, response: RequestHandlerResponse, handlerInfo: RequestHandlerInfo): Promise<void> {
        response.body = ['Hello']; /* Set body as array. */
        response.status = 200;

        /* If this was the last handler, send the response. */
        return handlerInfo.last ? response.send() as Promise<void> : Promise.resolve();
    }

    private _getWorldHandler(_: RequestHandlerRequest, response: RequestHandlerResponse): Promise<void> {
        /* Append to previously defined body array. */
        (response.body as unknown[]).push('World');
        response.status = 200;

        return response.send() as Promise<void>;
    }

    private _getValueHandler(request: RequestHandlerRequest, response: RequestHandlerResponse): Promise<void> {
        /* Append to previously defined body array. */
        (response.body as unknown[]).push(parseInt(request.params.value as string));
        response.status = 200;

        return response.send() as Promise<void>;
    }
}
