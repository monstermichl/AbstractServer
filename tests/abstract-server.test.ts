import {
    describe,
    it,
} from 'mocha';
import { expect } from 'chai';
import {
    AbstractServer,
    IServerConfig,
} from '../src/abstract-server';
import * as sinon from 'sinon';
import * as express from 'express';
import * as crypto from 'crypto';
import axios from 'axios';
import {
    Request,
    Response,
} from 'express';
import { 
    RequestMethod,
    Query,
    Params,
    Headers,
    RequestHandlerParams,
    RequestHandlerInternal,
} from '../src/request';
import { IRoute } from '../src/route';

class ServerMock extends AbstractServer {
    private _app = express();
    private _server: any;

    protected _defineRoutes(): IRoute[] {
        /* This function is faked by Sinon.JS. */
        return [];
    }
    protected _getMethod(req: Request): RequestMethod | null {
        let method;

        /* Map Express request method to AbstractServer request method. */
        switch (req.method.toUpperCase()) {
            case 'GET': method = RequestMethod.GET; break;
            case 'POST': method = RequestMethod.POST; break;
            case 'PATCH':
            case 'UPDATE': method = RequestMethod.PATCH; break;
            case 'DELETE': method = RequestMethod.DELETE; break;
        }
        return method || null;
    }

    protected _getQuery(req: Request): Query {
        /* Get Express request query. */
        return req.query;
    }

    protected _getPath(req: Request): string {
        /* Get Express request path. */
        return req.path;
    }

    protected _getParams(req: Request): Params {
        /* Get Express request params. */
        return req.params;
    }

    protected _getBody(req: Request): Body {
        /* Get Express request body. */
        return req.body;
    }

    protected _getHeaders(req: Request): Headers {
        /* Get Express request headers. */
        const headers: Headers = {};

        Object.entries(req.headers).filter(([_, value]) => value).forEach(([key, value]) => headers[key] = value || '');
        return headers;
    }

    protected _sendResponse(error: string | null, params: RequestHandlerParams, req: Request, res: Response): Promise<void> {
        let promise;

        /* Send OK response only, if no error occurred. */
        if (!error) {
            const responseParams = params.response;

            /* Set header fields. */
            Object.entries(responseParams.headers).forEach(([key, value]) => res.setHeader(key, value));
    
            /* Set status. */
            res.status(responseParams.status);
    
            /* Send body. */
            if ((responseParams.body instanceof Object) || (responseParams.body instanceof Array)) {
                res.json(responseParams.body);
            } else {
                res.send(responseParams.body);
            }
            promise = Promise.resolve();
        } else {
            /* Internal server error. */
            res.status(500).send(error);
        }
        return promise || Promise.reject();
    }

    protected _connect(config?: IServerConfig | undefined): Promise<void> {
        return new Promise((resolve, reject) => {
            const port = config?.port || 80;

            /* Start listening to specified port. */
            this._server = this._app
                .listen(port, () => resolve())
                .on('error', (err) => reject(err));
        });
    }

    protected _disconnect(): Promise<void> {
        return new Promise((resolve) => this._server ?
            this._server.close(() => resolve()) : Promise.reject());
    }

    protected _transformPath(path: string): string {
        /* Since AbstractServer uses the same pattern as Express (pathToRegExp), no transformation is necessary. */
        return path;
    }

    protected _addRoute(method: RequestMethod, route: string, handler: RequestHandlerInternal): Promise<boolean> {
        let promise;

        /* Use the appropriate handler to serve a request for the provided route. */
        switch (method) {
            case RequestMethod.GET: this._app.get(route, handler); break;
            case RequestMethod.POST: this._app.post(route, handler); break;
            case RequestMethod.PATCH: this._app.patch(route, handler); break;
            case RequestMethod.DELETE: this._app.delete(route, handler); break;

            default: promise = Promise.reject();
        }
        return promise || Promise.resolve(true);
    }
}

describe('AbstractServer tests', () => {
    const HOST = 'localhost';
    const PORT = 3000;
    const URL = `http://${HOST}:${PORT}`;
    const STANDARD_ROUTES = [{
        method: RequestMethod.GET,
        route: '/',
        handler: (params: RequestHandlerParams) => console.log(params),
    }] as IRoute[];
    let serverMock: ServerMock;

    function connect(): Promise<void> {
        return serverMock.connect({ port: PORT });
    }

    function mockRoutesDefinition(route: IRoute): void;
    function mockRoutesDefinition(routes: IRoute[]): void;
    function mockRoutesDefinition(arg: unknown): void {
        const defineRoutesFake = sinon.fake(() => (arg instanceof Array) ? arg : [arg]);
        sinon.replace(serverMock, '_defineRoutes' as any, defineRoutesFake);
    }

    function axiosMethodFromRequestMethod(method: RequestMethod): (...args: any[]) => Promise<unknown> {
        let axiosMethod;

        switch (method) {
            case RequestMethod.GET: axiosMethod = axios.get; break;
            case RequestMethod.POST: axiosMethod = axios.post; break;
            case RequestMethod.PATCH: axiosMethod = axios.patch; break;
            case RequestMethod.DELETE: axiosMethod = axios.delete; break;

            default: throw new Error('Invalid request method');
        }
        return axiosMethod;
    }

    function testRoutes(routes: IRoute[], axiosMethod: (...args: any[]) => Promise<unknown>, url: string): Promise<unknown> {
        mockRoutesDefinition(routes);
        return connect().then(() => axiosMethod.call(axios, url));
    }

    function testSimpleRoute(method: RequestMethod): Promise<unknown> {
        const routes = [{
            method,
            route: '/',
            handler: (requestParams: RequestHandlerParams) => {
                expect(requestParams.request.method).to.be.equal(method);

                requestParams.response.status = 200;
                return Promise.resolve();
            },
        }];
        return testRoutes(routes, axiosMethodFromRequestMethod(method), URL);
    }

    function testNestedRoute(method: RequestMethod): Promise<unknown> {
        const uuid = crypto.randomUUID().toString();
        const url = `${URL}/${uuid}`;
        const routes = [{
            method,
            route: '/',
            children: [{
                route: '/:uuid',
                handler: (requestParams: RequestHandlerParams) => {
                    expect(requestParams.request.method).to.be.equal(method);
                    expect(requestParams.request.params.uuid).to.be.equal(uuid);

                    requestParams.response.status = 200;
                    return Promise.resolve();
                },
            }],
        }];
        return testRoutes(routes, axiosMethodFromRequestMethod(method), url);
    }

    beforeEach(() => {
        serverMock = new ServerMock();
    });

    afterEach(() => {
        serverMock?.disconnect();
    });

    describe('Connect', () => {
        describe('Successful', () => {
            it('No routes', () => {
                return connect();
            });
            
            it('Routes', () => {
                mockRoutesDefinition(STANDARD_ROUTES);
                return connect();
            });
        });
    });

    describe('GET request', () => {
        describe('Successful', () => {
            it('Simple GET request', () => testSimpleRoute(RequestMethod.GET));
            it('Nested GET request with parameter', () => testNestedRoute(RequestMethod.GET));
        });
    });

    describe('POST request', () => {
        describe('Successful', () => {
            it('Simple POST request', () => testSimpleRoute(RequestMethod.POST));
            it('Nested POST request with parameter', () => testNestedRoute(RequestMethod.POST));
        });
    });

    describe('PATCH request', () => {
        describe('Successful', () => {
            it('Simple PATCH request', () => testSimpleRoute(RequestMethod.PATCH));
            it('Nested PATCH request with parameter', () => testNestedRoute(RequestMethod.PATCH));
        });
    });

    describe('DELETE request', () => {
        describe('Successful', () => {
            it('Simple DELETE request', () => testSimpleRoute(RequestMethod.DELETE));
            it('Nested DELETE request with parameter', () => testNestedRoute(RequestMethod.DELETE));
        });
    });
});
