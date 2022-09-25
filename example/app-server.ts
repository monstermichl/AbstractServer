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

/* Abstract implementation of the routes and the handling. This class does not
   depend on a specific framework. */
export abstract class AppServer extends AbstractServer {
    protected _defineRoutes(): IRoute[] {
        return [{
            method: RequestMethod.GET,
            route: '/hello',
            handler: this._getHelloHandler,
            children: [{
                route: '/world',
                handler: [this._getHelloHandler, this._getWorldHandler],
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

        responseParams.body = ['Hello'];
        responseParams.status = 200;

        return Promise.resolve();
    }

    private _getWorldHandler(params: RequestHandlerParams): Promise<void> {
        const responseParams = params.response;

        (responseParams.body as string[]).push('World');
        responseParams.status = 200;

        return Promise.resolve();
    }
}
