import {
    describe,
    it,
} from 'mocha';
import {
    AbstractServer,
    IServerConfig,
} from '../src/abstract-server';
import * as sinon from 'sinon';
import * as express from 'express';
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

    protected _defineRoutes(): IRoute[] {
        /* This function is faked by Sinon.JS. */
        throw new Error('Method not implemented.');
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
            this._app
                .listen(port, () => {
                    console.log(`Server listening to port ${port}`);
                    resolve();
                })
                .on('error', (err) => reject(err));
        });
    }

    protected _disconnect(): Promise<void> {
        throw new Error('Method not implemented.');
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
    let serverMock;

    const mockConnect = (routes: IRoute[], addRouteResult: Promise<boolean>, connectResult: Promise<void>) => {
        const defineRoutesFake = sinon.fake(() => routes);
        const transformPathFake = sinon.fake((path) => path);
        const addRouteFake = sinon.fake(() => addRouteResult);
        const connectFake = sinon.fake(() => connectResult);

        sinon.replace(serverMock, '_defineRoutes' as any, defineRoutesFake);
        sinon.replace(serverMock, '_transformPath' as any, transformPathFake);
        sinon.replace(serverMock, '_addRoute' as any, addRouteFake);
        sinon.replace(serverMock, '_connect' as any, connectFake);
    };

    beforeEach(() => {
        serverMock = new ServerMock();
    });

    afterEach(() => {
        serverMock?.disconnect();
    });

    it('Connect', async () => {
        mockConnect([{
            method: RequestMethod.GET,
            route: '/',
            handler: (params: RequestHandlerParams) => console.log(params),
        }] as IRoute[],
        Promise.resolve(true),
        Promise.resolve());

        await serverMock.connect().then(() => console.log('connected'));
    });
});
