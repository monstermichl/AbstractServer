import * as stream from 'node:stream';

export enum RequestMethod {
    GET = 1,
    POST = 2,
    PUT = 3,
    PATCH = 4,
    DELETE = 5,
}

const DEFAULT_HEADERS = {};
const DEFAULT_BODY = null;
const DEFAULT_MISC = {};
const DEFAULT_STATUS = 418; /* I'm a teapot. */

interface RequestHandlerCommonParams {
    misc: Misc,
}

export interface RequestHandlerResponseServerCallouts {
    setStatus: (status: number, ...args: unknown[]) => boolean;
    setHeader: (header: string, value: HeaderValue, ...args: unknown[]) => boolean;
    send: (body: Body, ...args: unknown[]) => Promise<unknown>;
}

export class RequestHandlerRequest implements RequestHandlerCommonParams {
    constructor(
        public method: RequestMethod,
        public headers: Headers,
        public path: string,
        public params: Params,
        public query: Query,
        public body: Body,
        public misc: Misc = DEFAULT_MISC,
    ) {}
}

export class RequestHandlerResponse implements RequestHandlerCommonParams {
    private _serverCallouts: RequestHandlerResponseServerCallouts;
    private _args: unknown[];
    private _responseStream: stream.Writable;
    private _status: number = DEFAULT_STATUS;
    private _headers: Headers = DEFAULT_HEADERS;
    private _body: Body = DEFAULT_BODY;

    constructor(
        serverCallouts: RequestHandlerResponseServerCallouts,
        args: unknown[],
        responseStream: stream.Writable,
        public misc: Misc = DEFAULT_MISC,
    ) {
        this._serverCallouts = serverCallouts;
        this._args = args;
        this._responseStream = responseStream;
        this.status = this._status;
    }

    get status(): number {
        return this._status;
    }

    set status(status: number) {
        this._status = status;
    }

    get body(): Body {
        return this._body;
    }

    set body(body: Body) {
        this._body = body;
    }

    get stream(): stream.Writable {
        return this._responseStream;
    }

    setHeader(header: string, value: HeaderValue) {
        this._headers[header] = value;
    }

    send(): Promise<unknown> {
        /* Set status. */
        this._serverCallouts.setStatus(this._status, ...this._args);

        /* Set headers. */
        Object.entries(this._headers).forEach(([header, value]) =>
            this._serverCallouts.setHeader(header, value, ...this._args));

        /* Send response. */
        return this._serverCallouts.send(this._body, ...this._args);
    }
}

export type Params = Record<string, unknown>;
export type Query = Record<string, unknown>;
export type Body = unknown;
export type Misc = Record<string, unknown>;
export type HeaderValue = string | string[];
export type Headers = Record<string, HeaderValue>;
export type RequestHandlerInternal = (...args: unknown[]) => Promise<void>;
export type RequestHandler = (request: RequestHandlerRequest, response: RequestHandlerResponse, next: RequestNextHandler) => Promise<void>;
export type RequestNextHandler = () => Promise<void>;
