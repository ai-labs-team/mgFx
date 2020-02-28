import { localConnector, implement, define } from 'mgfx';
import { ioTs, t } from '@mgfx/validator-iots';
import express from 'express';
import errorhandler from 'errorhandler';
import { after, reject, fork } from 'fluture';
import request from 'supertest';

import { expressMiddleware } from './index';

const mgFx = localConnector();

const greet = implement(
  define({
    name: 'greet',
    input: ioTs(t.string),
    output: ioTs(t.string)
  }),
  name => {
    if (name.startsWith('_')) {
      return reject(new Error(`Invalid name ${name}`));
    }

    return `Hello ${name}!`;
  }
);

const echoContext = implement(
  define({
    name: 'echoContext',
    input: ioTs(t.void),
    output: ioTs(t.any),
    context: {
      'http.method': ioTs(t.string)
    }
  }),
  (_, { context }) => ({ context })
);

mgFx.serveModule({ greet, echoContext });

const app = express();
app.use(
  expressMiddleware({
    connector: mgFx,
    values: { isTest: true },
    captureValues: req => ({
      requestId: req.headers['x-request-id'] as string
    })
  })
);

app
  .get('/runF/:name', req => {
    req.mgFx.runF(greet(req.params.name));
  })
  .get('/run/:name', (req, res, next) => {
    req.mgFx
      .run(greet(req.params.name))
      .pipe(
        fork((err: Error) =>
          next(new Error(`error was: ${err.message}`))
        )(msg => res.send(`msg was: ${msg}`))
      );
  })
  .get('/fork/:name', req => {
    const f =
      req.params.name === 'badman'
        ? reject(new Error('oops'))
        : after(100)(`Hello ${req.params.name}!`);

    req.mgFx.fork(f);
  })
  .route('/echo')
  .get(req => req.mgFx.runF(echoContext()))
  .post(req => req.mgFx.runF(echoContext()));

app.use(errorhandler());

describe('runF', () => {
  it('runs a Process and forks using `req.send`', async () => {
    const result = await request(app).get('/runF/world');
    expect(result.text).toBe('Hello world!');
  });

  it('handles a Task that rejects', async () => {
    const result = await request(app)
      .get('/runF/_world')
      .set('Accept', 'application/json');

    expect(result.body.error.message).toBe('Invalid name _world');
  });
});

describe('run', () => {
  it('runs a Process but does not fork implicitly', async () => {
    const result = await request(app).get('/run/world');
    expect(result.text).toBe('msg was: Hello world!');
  });

  it('allows custom error handling', async () => {
    const result = await request(app)
      .get('/run/_world')
      .set('Accept', 'application/json');

    expect(result.body.error.message).toBe('error was: Invalid name _world');
  });
});

describe('fork', () => {
  it('uses `req.send` as a resolution receiver', async () => {
    const result = await request(app).get('/fork/world');
    expect(result.text).toBe('Hello world!');
  });

  it('uses `next` as a rejection receiver', async () => {
    const result = await request(app)
      .get('/fork/badman')
      .set('Accept', 'application/json');

    expect(result.body.error.message).toBe('oops');
  });
});

describe('context handling', () => {
  it('implicitly sets Context values', async () => {
    const getResult = await request(app)
      .get('/echo')
      .set('X-Request-Id', '1234');

    expect(getResult.body).toEqual({
      context: {
        isTest: true,
        'http.path': '/echo',
        'http.method': 'GET',
        requestId: '1234'
      }
    });

    const postResult = await request(app)
      .post('/echo')
      .set('X-Request-Id', '4567');

    expect(postResult.body).toEqual({
      context: {
        isTest: true,
        'http.path': '/echo',
        'http.method': 'POST',
        requestId: '4567'
      }
    });
  });
});
