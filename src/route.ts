import {
    RequestHandler,
    RequestMethod,
} from './request';

export interface IRoute {
    method: RequestMethod;
    route: string;
    handler?: RequestHandler | RequestHandler[];
    children?: ISubRoute[];
}

export interface ISubRoute {
    route: string;
    handler?: RequestHandler | RequestHandler[];
    children?: ISubRoute[];
}
