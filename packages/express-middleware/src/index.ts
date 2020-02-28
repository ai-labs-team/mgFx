import { RequestHandler, Request } from 'express';
import { Connector, RunFn } from 'mgfx/dist/connector';
import { Values, Context } from 'mgfx/dist/context';
import { Process } from 'mgfx/dist/task';
import { fork as _fork, FutureInstance } from 'fluture';

declare global {
  namespace Express {
    interface Request {
      mgFx: {
        run: RunFn;
        getContext: () => Context;
        fork: (f: FutureInstance<any, any>) => void;
        runF: (process: FutureInstance<any, Process>) => () => void;
      };
    }
  }
}

export type Config = {
  connector: Connector;
  values?: Values;
  captureValues?: (request: Request) => Values;
};

type ContextCache = {
  [path: string]: {
    context: Context;
    methods: {
      [method: string]: Context;
    };
  };
};

export const makeContextCache = (root: Context) => {
  const cache: ContextCache = {};

  const getByPath = (path: string) => {
    const match = cache[path];
    if (match) {
      return match;
    }

    const context = root.createChild({
      'http.path': path
    });

    cache[path] = {
      context,
      methods: {}
    };

    return cache[path];
  };

  return (path: string, method: string) => {
    const match = getByPath(path);
    if (match.methods[method]) {
      return match.methods[method];
    }

    const context = match.context.createChild({
      'http.method': method
    });

    return (cache[path].methods[method] = context);
  };
};

export const expressMiddleware = (config: Config): RequestHandler => {
  const rootContext = config.connector.createContext(config.values || {});
  const getCachedContext = makeContextCache(rootContext);

  return (req, res, next) => {
    const send = res.send.bind(res);
    const fork = _fork(next)(send);

    const getContext = () => {
      const context = getCachedContext(req.route.path, req.method);

      return config.captureValues
        ? context.createChild(config.captureValues(req))
        : context;
    };

    const run: RunFn = process => getContext().run(process);

    req.mgFx = {
      getContext,
      fork,
      run: run,
      runF: dispatch => run(dispatch).pipe(fork)
    };

    next();
  };
};
