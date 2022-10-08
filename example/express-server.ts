/* <ignore-in-readme> */
import * as express from 'express';
import {
    Request,
    Response,
} from 'express';
import { IServerConfig } from '../src/abstract-server';
import {
    RequestMethod,
    Query,
    Params,
    Body,
    Headers,
    RequestHandlerInternal,
    HeaderValue,
} from '../src/request';
import { AppServer } from './app-server';
/* <dont-ignore-in-readme> */

/* Actual implementation which depends on the Express framework. */
export class ExpressServer extends AppServer {
    private _app = express();
    private _server: any;

    protected _getMethod(req: Request): RequestMethod | null {
        let method = null;

        /* Map Express request method to AbstractServer request method. */
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
                .listen(port, () => {
                    console.log(`Server listening to port ${port}`);
                    resolve();
                 })
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
