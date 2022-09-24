export enum RequestMethod {
    GET = 1,
    POST = 2,
    PATCH = 3,
    DELETE = 4,
}

export type Params = Record<string, unknown>;
export type Query = Record<string, unknown>;
export type Body = unknown;
export type RequestHandler = (...args: unknown[]) => Promise<void>;
export type RequestHandlerInternal = (path: string, params: Params, queryParams: Query, body: Body) => Promise<unknown>;
