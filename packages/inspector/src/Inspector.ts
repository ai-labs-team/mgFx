import { DbAdapter } from './DbAdapter';
import Koa from 'koa';
import logger from 'koa-logger';
import serve from 'koa-static-server';
import Router from '@koa/router';
import { resolve } from 'path';

import { Args } from '.';

type Config = {
  adapter: DbAdapter;
  args: Args;
}

export class Inspector {
  protected _server: Koa;
  protected _router: Router;

  constructor(protected _config: Config) {
    const { adapter, args } = _config;

    this._server = new Koa();
    this._router = new Router();

    this._router
      .get('/api/contexts', async (ctx) => {
        ctx.assert(ctx.query.start, 400, `Missing query parameter 'start'`);
        ctx.assert(ctx.query.end, 400, `Missing query parameter 'end'`);

        ctx.body = await adapter.contexts({
          start: ctx.query.start,
          end: ctx.query.end,
          parentId: ctx.query.parentId || null
        });
      })
      .get('/api/context-timings', async (ctx) => {
        ctx.assert(ctx.query.start, 400, `Missing query parameter 'start'`);
        ctx.assert(ctx.query.end, 400, `Missing query parameter 'end'`);

        ctx.body = await adapter.contextTimings({
          start: ctx.query.start,
          end: ctx.query.end
        });
      })
      .get('/api/executions', async (ctx) => {
        ctx.assert(ctx.query.start, 400, `Missing query parameter 'start'`);
        ctx.assert(ctx.query.end, 400, `Missing query parameter 'end'`);

        ctx.body = await adapter.executions({
          start: ctx.query.start,
          end: ctx.query.end
        });
      })
      .get('/api/executions/:id', async (ctx) => {
        const execution = await adapter.execution(ctx.params.id);

        if (execution) {
          ctx.body = execution;
        } else {
          ctx.status = 404;
        }
      });

    this._server
      .use(logger())
      .use(this._router.routes())
      .use(serve({
        rootDir: resolve(__dirname, 'ui'),
        notFoundFile: 'index.html'
      }));

    this._server.listen(args.port);

    console.log(`mgFx Inspector: Started HTTP server on port '${args.port}'`);
  }
}
