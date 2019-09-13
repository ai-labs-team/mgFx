import { Application, IRouterMatcher, Request, Response, NextFunction } from 'express';
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

export type ExtRequest<Config> = Request & { config: Config };

export type RequestHandler<Config> = {
  (req: ExtRequest<Config>, res: Response, next: NextFunction): any;
}

export type MethodHandlers<Config> = {
  [P in MethodName]: RequestHandler<Config>
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

  route<Config>(path: string, methodHandlers: Partial<MethodHandlers<Config>>) {
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
        (req: any, { }: any, next: NextFunction) => {
          req.exec = methodCtx.exec.bind(methodCtx);
          req.config = {};
          next();
        },
        methodHandlers[method as MethodName]! as any
      );
    }
  }
}
