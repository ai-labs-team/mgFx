import { Router } from 'express';
import { localConnector } from 'mgfx';
import { makeAnalyzer } from '@mgfx/analyzer';
import { sqlite } from '@mgfx/analyzer-storage-sqlite';
import { expressMiddleware } from '@mgfx/express-middleware';
import { httpServer } from '@mgfx/analyzer-http-server';

import * as tasks from './tasks';
import { bodyParser } from 'json-server';

const connector = localConnector();
const analyzer = makeAnalyzer({
  storage: sqlite({})
});
connector.use(analyzer.collector);
// @ts-ignore
connector.serveModule(tasks);

const baseUrl = `http://localhost:${process.env.HTTP_PORT || 8080}`;

export const bridge = Router()
  .use(bodyParser)
  .use(
    expressMiddleware({
      connector,
      values: {
        coreUrl: `${baseUrl}/core`,
        bankAUrl: `${baseUrl}/external/bankA`,
        bankBUrl: `${baseUrl}/external/bankB`,
        bankCUrl: `${baseUrl}/external/bankC`
      }
    })
  )
  .use('/mgFx', httpServer({ analyzer }))
  .post('/accounts/refresh', req => {
    req.mgFx.runPid(tasks.refresh(req.body));
  });
