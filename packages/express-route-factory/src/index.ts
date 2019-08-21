import { Application, RequestHandler, IRouterMatcher, ParamsDictionary } from 'express-serve-static-core';
import { Context } from 'mgfx';

export type MethodName =
  | 'all'
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'path'
  | 'options'
  | 'head';

export type MethodHandlers = {
  [P in MethodName]: RequestHandler
}


declare global {
  namespace Express {
    interface Request {
      exec: Context['exec']
    }
  }
}

export type Config = {
  app: Application;
  context: Context;
}

export class ExpressRouteFactory {
  constructor(protected readonly _config: Config) { }

  route(path: string, methodHandlers: Partial<MethodHandlers>) {
    const { context, app } = this._config;

    const pathCtx = context.createChild({
      labels: { path }
    });

    for (const method in methodHandlers) {
      const methodCtx = pathCtx.createChild({
        labels: { method }
      });

      (app[method as MethodName] as IRouterMatcher<any>)(
        path,
        (req, _, next) => {
          req.exec = methodCtx.exec.bind(methodCtx);
          next();
        },
        methodHandlers[method as MethodName]!
      );
    }
  }
}
