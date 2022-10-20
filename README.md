# AbstractServer
The idea behind AbstractServer is to abstract the logic of a Node.js server from the actual implementation which typically depends on a specific framework e.g. Express. This way it's easier to replace the framework if required since the logic doesn't have to be implemented again. To realize this idea, the logical parts of the server are usually implemented by a class derived from AbstractServer. However, this class (let's call it AppServer) does not implement the server framework's specific functions but rather keeps them abstract as well. Finally, a third class (let's call it ExpressServer) derives from AppServer and implements the functions which are framework specific. This might seem tedious at the beginning but saves a lot of time if the framework needs to be changed or gets outdated. *Please feel free to participate on this project as I'm pretty sure there's still a lot to improve.*

---

## Installation
```
npm install el-abstracto
```
---

## Example
### AppServer
```typescript
/* Abstract implementation of the routes and the handling. This class does not depend on a specific framework. */
export abstract class AppServer extends AbstractServer {
    /* Define all routes required by the App and the handlers which do the logical processing. */
    protected _defineRoutes(): IRoute[] {
        return [{
            method: RequestMethod.GET,
            route: '/hello',
            children: [{
                route: '/world', /* Listen to /hello/world. */

                /* Use several request handlers. The second one is only executed if the first one succeeds. */
                handler: [this._helloMiddleware, this._getWorldHandler],
            }]
        }, {
            method: RequestMethod.GET,
            route: '/:value', /* Listen to /:value. */
            handler: [this._getValueHandler],
        }] as IRoute[];
    }

    protected abstract _getMethod(...args: unknown[]): RequestMethod | null;
    protected abstract _getQuery(...args: unknown[]): Query;
    protected abstract _getPath(...args: unknown[]): string;
    protected abstract _getParams(...args: unknown[]): Params;
    protected abstract _getBody(...args: unknown[]): Body;
    protected abstract _getHeaders(...args: unknown[]): Headers;
    protected abstract _setHeader(header: string, value: HeaderValue, ...args: unknown[]): boolean;
    protected abstract _setStatus(status: number, ...args: unknown[]): boolean;
    protected abstract _send(body?: Body, ...args: unknown[]): Promise<void>;
    protected abstract _connect(config?: IServerConfig | undefined): Promise<void>;
    protected abstract _disconnect(): Promise<void>;
    protected abstract _transformPath(path: string): string;
    protected abstract _addRoute(method: RequestMethod, route: string, handler: RequestHandlerInternal): Promise<boolean>;

    private async _helloMiddleware(_: RequestHandlerRequest, response: RequestHandlerResponse, next: RequestNextHandler): Promise<void> {
        response.body = ['Hello']; /* Set body as array. */
        response.status = 200;

        return next();
    }

    private _getWorldHandler(_: RequestHandlerRequest, response: RequestHandlerResponse): Promise<void> {
        /* Append to previously defined body array. */
        (response.body as unknown[]).push('World');
        response.status = 200;

        return response.send() as Promise<void>;
    }

    private _getValueHandler(request: RequestHandlerRequest, response: RequestHandlerResponse): Promise<void> {
        response.body = `Provided param: ${request.params.value}`;
        response.status = 200;

        return response.send() as Promise<void>;
    }
}
```

### ExpressServer
```typescript
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

            default: promise = Promise.reject('Unknown method');
        }
        return promise || Promise.resolve(true);
    }
}
```

---

## Additional info
If you use InversifyJS or some other Inversion of Control framework, ensure to make AbstractServer injectable. In the case of InversifyJS this would work as follows.
```typescript
/* Make sure, AbstractServer is injectable. */
decorate(injectable(), AbstractServer);
```

---

## TODO
- [ ] Implement streaming capabilites (RequestHandlerResponse should act as output stream)
- [ ] Implement TLS and certificate handling
