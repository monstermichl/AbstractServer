import {
    RequestHandlerInternal,
    RequestMethod,
} from './request';

export interface IRoute {
    method: RequestMethod;
    route: string;
    handler?: RequestHandlerInternal;
    children?: ISubRoute[];
}

export interface ISubRoute {
    route: string;
    handler: RequestHandlerInternal;
    children?: ISubRoute[];
}
