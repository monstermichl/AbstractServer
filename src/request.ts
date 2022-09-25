export enum RequestMethod {
    GET = 1,
    POST = 2,
    PATCH = 3,
    DELETE = 4,
}

interface RequestHandlerCommonParams {
    body: Body,
    headers: Headers,
}

export interface RequestHandlerRequestParams extends RequestHandlerCommonParams {
    path: string,
    params: Params,
    query: Query,
}

export interface RequestHandlerResponseParams extends RequestHandlerCommonParams {
    status: number,
}

export interface RequestHandlerParams {
    request: RequestHandlerRequestParams,
    response: RequestHandlerResponseParams,
}

export type Params = Record<string, unknown>;
export type Query = Record<string, unknown>;
export type Body = unknown;
export type Headers = Record<string, string | string[]>;
export type RequestHandlerInternal = (...args: unknown[]) => Promise<void>;
export type RequestHandler = (params: RequestHandlerParams) => Promise<void>;
