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
    RequestHandlerInternal,
    RequestHandlerRequest,
    RequestHandlerResponse,
    RequestNextHandler,
    HeaderValue,
    RequestHandler,
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

    protected _setHeader(header: string, value: HeaderValue, _: Request, res: Response): boolean {
        res.setHeader(header, value);
        return true;
    }

    protected _setStatus(status: number, _: Request, res: Response): boolean {
        res.status(status);
        return true;
    }

    protected _send(body: Body, _: Request, res: Response): Promise<void> {
        /* Send body. */
        if (!body) {
            res.send();
        } else if ((body instanceof Object) || (body as any instanceof Array)) {
            res.json(body);
        } else {
            res.send(body);
        }
        return Promise.resolve();
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

            default: promise = Promise.reject('Unknown method');
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
        handler: (
            _: RequestHandlerRequest,
            response: RequestHandlerResponse,
        ) => response.send(),
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

    function mockConnectFails(): void {
        const connectFake = sinon.fake(() => Promise.reject());
        sinon.replace(serverMock, '_connect' as any, connectFake);
    }

    function mockNoMethod(): void {
        const getMethodFake = sinon.fake(() => null);
        sinon.replace(serverMock, '_getMethod' as any, getMethodFake);
    }

    function mockPath(path: string): void {
        const getPathFake = sinon.fake(() => path);
        sinon.replace(serverMock, '_getPath' as any, getPathFake);
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

    function testRoutes(route: IRoute, axiosMethod: (...args: any[]) => Promise<unknown>, url: string): Promise<unknown>;
    function testRoutes(routes: IRoute[], axiosMethod: (...args: any[]) => Promise<unknown>, url: string): Promise<unknown>;
    function testRoutes(arg: any, axiosMethod: (...args: any[]) => Promise<unknown>, url: string): Promise<unknown> {
        mockRoutesDefinition(arg);
        return connect().then(() => axiosMethod.call(axios, url));
    }

    function testSimpleRoute(method: RequestMethod, array?: boolean): Promise<unknown>;
    function testSimpleRoute(method: RequestMethod, callout?: RequestHandler): Promise<unknown>;
    function testSimpleRoute(method: RequestMethod, callouts?: RequestHandler[]): Promise<unknown>;
    function testSimpleRoute(method: RequestMethod, arg: unknown = true): Promise<unknown> {
        let array: boolean;
        let callout;

        if (typeof arg === 'boolean') {
            array = arg;
        } else {
            array = false;
            callout = arg;
        }

        const route = {
            method,
            route: '/',
            handler: callout ? callout : (
                request: RequestHandlerRequest,
                response: RequestHandlerResponse,
                next: RequestNextHandler
            ) => {
                expect(request.method).to.be.equal(method);

                /* Read properties for the coverage. */
                response.body;
                response.status;
                response.misc;

                /* Set response. */
                response.status = 200;
                response.body = [];
                response.setHeader('content-type', 'application/json');

                return response.send();
            },
        } as IRoute;
        return testRoutes(array ? [route] as any: route, axiosMethodFromRequestMethod(method), URL);
    }

    function testNestedRoute(method: RequestMethod): Promise<unknown> {
        const uuid = crypto.randomUUID().toString();
        const subRoute = 'sub';
        const url = `${URL}/${subRoute}/${uuid}`;
        const routes = [{
            method,
            route: '/',
            children: [{
                route: `${subRoute}`,
                children: [{
                    route: '/:uuid',
                    handler: (
                        request: RequestHandlerRequest,
                        response: RequestHandlerResponse,
                        next: RequestNextHandler
                    ) => {
                        expect(request.method).to.be.equal(method);
                        expect(request.params.uuid).to.be.equal(uuid);
        
                        response.status = 200;
                        return response.send();
                    },
                }],
            }],
        }] as IRoute[];
        return testRoutes(routes, axiosMethodFromRequestMethod(method), url);
    }

    beforeEach(() => {
        serverMock = new ServerMock();
    });

    afterEach(() => {
        sinon.restore();
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

            it('Routes are defined, but connect fails', () => {
                mockConnectFails();
                return connect().catch(() => {
                    sinon.restore();
                    return connect();
                });
            });
        });

        describe('Failed', () => {
            it('No routes', () => {
                mockConnectFails();

                /* Return inversed logic to test if connect failed. */
                return connect()
                    .then(() => Promise.reject())
                    .catch(() => Promise.resolve());
            });

            it('Null route', () => {
                mockRoutesDefinition([null as unknown as IRoute]);

                /* Return inversed logic to test if connect failed. */
                return connect()
                    .then(() => Promise.reject())
                    .catch(() => Promise.resolve());
            });

            it('Already connected', () => {
                /* Return inversed logic to test if connect failed. */
                return connect()
                    .then(() => connect())
                    .then(() => Promise.reject())
                    .catch(() => Promise.resolve());
            });
        });
    });

    describe('Handle GET, POST, PATCH and DELETE requests', () => {
        describe('Successful', () => {
            it('GET', () => testSimpleRoute(RequestMethod.GET, false));
            it('GET', () => testSimpleRoute(RequestMethod.GET));
            it('POST', () => testSimpleRoute(RequestMethod.POST));
            it('PATCH', () => testSimpleRoute(RequestMethod.PATCH));
            it('DELETE', () => testSimpleRoute(RequestMethod.DELETE));
            it('GET', () => testNestedRoute(RequestMethod.GET));
            it('POST', () => testNestedRoute(RequestMethod.POST));
            it('PATCH', () => testNestedRoute(RequestMethod.PATCH));
            it('DELETE', () => testNestedRoute(RequestMethod.DELETE));
        });

        describe('Failed', () => {
            it('No method', () => {
                mockNoMethod();
                return testSimpleRoute(RequestMethod.GET)
                    .then(() => Promise.reject())
                    .catch((err) => expect(err.response.data).to.be.equal('No request method'));
            });

            it('No request handler', () => {
                mockPath('/no-valid-path-4-sure');
                return testSimpleRoute(RequestMethod.GET)
                    .then(() => Promise.reject())
                    .catch((err) => {
                        expect(err.response.data).to.be.equal('No request handler');
                    });
            });

            it('Request handler null', () => {
                return testSimpleRoute(RequestMethod.GET, [null as unknown as RequestHandler])
                    .then(() => Promise.reject())
                    .catch((err) => {
                        expect(err.response.data).to.be.equal('No callout');
                    });
            });

            it('Request handler failed', () => {
                const rejectMessage = 'Failed-4-sure';
                return testSimpleRoute(RequestMethod.GET, (
                    _: RequestHandlerRequest,
                    response: RequestHandlerResponse
                ) => {
                    response.body = rejectMessage;
                    return response.send() as Promise<void>;
                })
                    .then(() => Promise.reject())
                    .catch((err) => expect(err.response.data).to.be.equal(rejectMessage));
            });
        });
    });
});
