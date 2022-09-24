import * as express from 'express';
import {
    Request,
    Response,
    NextFunction,
} from 'express';
import {
    AbstractServer,
    IServerConfig,
    RequestProcessingResult,
} from '../src/abstract-server';
import {
    RequestMethod,
    Query,
    Params,
    RequestHandler,
} from '../src/request';
import { IRoute } from '../src/route';

/* Abstract implementation of the routes and the handling. This class does not
   depend on a specific framework. */
abstract class AppServerImplementation extends AbstractServer {
    protected _defineRoutes(): IRoute[] {
        return [{
            method: RequestMethod.GET,
            route: '/hello',
            handler: this._getHelloHandler,
            children: [{
                route: '/world',
                handler: this._getHelloWorldHandler,
            }]
        }] as IRoute[];
    }

    protected abstract _getMethod(...args: unknown[]): RequestMethod | null;
    protected abstract _getQuery(...args: unknown[]): Query;
    protected abstract _getPath(...args: unknown[]): string;
    protected abstract _getParams(...args: unknown[]): Params;
    protected abstract _getBody(...args: unknown[]): Body;
    protected abstract _sendResponse(result: RequestProcessingResult, response: unknown, ...args: unknown[]): Promise<void>;
    protected abstract _connect(config?: IServerConfig | undefined): Promise<void>;
    protected abstract _disconnect(): Promise<void>;
    protected abstract _transformPath(path: string): string;
    protected abstract _addRoute(method: RequestMethod, route: string, handler: RequestHandler): Promise<boolean>;

    private _getHelloHandler(path: string, params: Params, queryParams: Query, body: Body): Promise<unknown> {
        return Promise.resolve('Hello');
    }

    private _getHelloWorldHandler(path: string, params: Params, queryParams: Query, body: Body): Promise<unknown> {
        return Promise.resolve('Hello World');
    }
}

/* Actual implementation which depends on the Express framework. */
class ExpressServerImplementation extends AppServerImplementation {
    private _app = express();

    protected _getMethod(req: Request): RequestMethod | null {
        let method = null;

        switch (req.method.toUpperCase()) {
            case 'GET': method = RequestMethod.GET; break;
            case 'POST': method = RequestMethod.POST; break;
            case 'PATCH':
            case 'UPDATE': method = RequestMethod.PATCH; break;
            case 'DELETE': method = RequestMethod.DELETE; break;
        }
        return method;
    }

    protected _getQuery(req: Request): Query {
        return req.query;
    }

    protected _getPath(req: Request): string {
        return req.path;
    }

    protected _getParams(req: Request): Params {
        return req.params;
    }

    protected _getBody(req: Request): Body {
        return req.body;
    }

    protected _sendResponse(result: RequestProcessingResult, response: unknown, req: Request, res: Response, next: NextFunction): Promise<void> {
        let promise;

        if (result === RequestProcessingResult.Ok) {
            res.status(200).send(response);
            promise = Promise.resolve();
        } else {
            res.status(500).send();
            promise = Promise.reject();
        }
        return promise;
    }

    protected _connect(config?: IServerConfig | undefined): Promise<void> {
        return new Promise((resolve, reject) => {
            const port = config?.port || 80;

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

    protected _addRoute(method: RequestMethod, route: string, handler: RequestHandler): Promise<boolean> {
        let promise;

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

/* Instantiate ExpressServerImplementation and listen to port 3000. */
const server = new ExpressServerImplementation();
server.connect({
    port: 3000
});
