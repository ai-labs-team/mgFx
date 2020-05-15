import express from 'express';
import { reject, after, chain, promise, map } from 'fluture';
import { localConnector, implement, define, fork } from 'mgfx';
import request from 'supertest';
import { PassThrough } from 'stream';
import { unlink as _unlink } from 'fs';
import { promisify } from 'util';

import { ioTs, t } from '@mgfx/validator-iots';
import { makeAnalyzer } from '@mgfx/analyzer';
import { sqlite } from '@mgfx/analyzer-storage-sqlite';

import { httpServer } from './index';

const unlink = promisify(_unlink);

const analyzer = makeAnalyzer({
  storage: sqlite({}),
});
const connector = localConnector();
connector.use(analyzer.collector);

const greet = implement(
  define({ name: 'greet', input: ioTs(t.string), output: ioTs(t.string) }),
  (name) => {
    if (name.startsWith('_')) {
      return reject(new Error(`Invalid name ${name}`));
    }

    return after(100)(`Hello ${name}!`);
  }
);

connector.serve(greet);

const app = express();
app.use(
  '/analyzer',
  httpServer({
    analyzer,
  })
);

afterAll(async () => {
  await unlink('mgfx-analyzer.sqlite');
});

describe('/collector', () => {
  it('collects events received via HTTP', async () => {
    await request(app)
      .post('/analyzer/collector')
      .set('Accept', 'application/json')
      .send({
        timestamp: 1,
        kind: 'process',
        process: {
          spec: {
            name: 'test',
          },
          id: 'test-1',
          input: 'hello',
        },
      });

    await new Promise((resolve) => setTimeout(() => resolve(), 200));

    const runningResponse = await request(app)
      .get('/analyzer/query/spans')
      .query({ q: JSON.stringify({ v: { scope: { id: 'test-1' } } }) })
      .set('Accept', 'application/json');

    expect(runningResponse.body).toEqual([
      {
        id: 'test-1',
        createdAt: 1,
        process: {
          spec: {
            name: 'test',
          },
        },
        input: 'hello',
        state: 'running',
      },
    ]);

    await request(app)
      .post('/analyzer/collector')
      .set('Accept', 'application/json')
      .send({
        timestamp: 2,
        kind: 'resolution',
        id: 'test-1',
        value: 'world',
      });

    await new Promise((resolve) => setTimeout(() => resolve(), 200));

    const resolvedResponse = await request(app)
      .get('/analyzer/query/spans')
      .query({ q: JSON.stringify({ v: { scope: { id: 'test-1' } } }) })
      .set('Accept', 'application/json');

    expect(resolvedResponse.body).toEqual([
      {
        id: 'test-1',
        createdAt: 1,
        endedAt: 2,
        process: {
          spec: {
            name: 'test',
          },
        },
        input: 'hello',
        state: 'resolved',
        output: 'world',
      },
    ]);
  });
});

describe('/query/spans', () => {
  it('responds with an empty list of spans', async () => {
    const process = await greet('World').pipe(promise);

    const response = await request(app)
      .get('/analyzer/query/spans')
      .query({ q: JSON.stringify({ v: { scope: { id: process.id } } }) })
      .set('Accept', 'application/json');

    expect(response.body).toEqual([]);
  });

  it('responds with a populated list of spans', (done) => {
    let processId: string;
    expect.assertions(2);

    greet('World')
      .pipe(
        map((process) => {
          processId = process.id;
          return process;
        })
      )
      .pipe(connector.run)
      .pipe(fork.toBackground);

    setTimeout(async () => {
      const response = await request(app)
        .get('/analyzer/query/spans')
        .query({ q: JSON.stringify({ v: { scope: { id: processId } } }) })
        .set('Accept', 'application/json');

      expect(response.body).toEqual([
        {
          createdAt: expect.any(Number),
          id: processId,
          input: 'World',
          state: 'running',
          process: {
            spec: {
              name: 'greet',
            },
          },
        },
      ]);
    }, 50);

    setTimeout(async () => {
      const response = await request(app)
        .get('/analyzer/query/spans')
        .query({ q: JSON.stringify({ v: { scope: { id: processId } } }) })
        .set('Accept', 'application/json');

      expect(response.body).toEqual([
        {
          createdAt: expect.any(Number),
          id: processId,
          input: 'World',
          endedAt: expect.any(Number),
          state: 'resolved',
          output: 'Hello World!',
          process: {
            spec: {
              name: 'greet',
            },
          },
        },
      ]);

      done();
    }, 150);
  });
});

describe('/query/spans/observe', () => {
  it('sends an update for every change', (done) => {
    let processId: string;
    let req: any;

    expect.assertions(3);

    const extract = (message: string) =>
      JSON.parse(message.replace('data: ', ''));

    let n = 0;
    const fakeStream = new PassThrough();
    fakeStream.on('data', (message) => {
      const data = extract(message.toString());
      if (n === 0) {
        n += 1;
        return expect(data).toEqual([]);
      }

      if (n === 1) {
        n += 1;
        return expect(data).toEqual([
          {
            createdAt: expect.any(Number),
            id: processId,
            input: 'World',
            state: 'running',
            process: {
              spec: {
                name: 'greet',
              },
            },
          },
        ]);
      }

      if (n === 2) {
        expect(data).toEqual([
          {
            createdAt: expect.any(Number),
            id: processId,
            input: 'World',
            endedAt: expect.any(Number),
            state: 'resolved',
            output: 'Hello World!',
            process: {
              spec: {
                name: 'greet',
              },
            },
          },
        ]);

        done();
      }
    });

    greet('World')
      .pipe(
        map((process) => {
          processId = process.id;

          request(app)
            .get('/analyzer/query/spans/observe')
            .query({ q: JSON.stringify({ v: { scope: { id: process.id } } }) })
            .pipe(fakeStream);

          return process;
        })
      )
      .pipe(chain(after(100)))
      .pipe(connector.run)
      .pipe(fork.toBackground);
  });

  describe('when `deltas` query param is set', () => {
    it('sends an initial full update, followed by deltas', (done) => {
      let processId: string;
      let req: any;

      expect.assertions(5);

      const extract = (message: string) =>
        JSON.parse(message.replace('data: ', ''));

      let n = 0;
      const fakeStream = new PassThrough();
      fakeStream.on('data', (message) => {
        if (n === 0) {
          n += 1;
          const data = extract(message.toString());
          return expect(data).toEqual([]);
        }

        if (n === 1) {
          n += 1;
          const lines = message.toString().split('\n');
          expect(lines[0]).toEqual('event: delta');

          const data = extract(lines[1].toString());
          return expect(data).toEqual({
            _t: 'a',
            0: [
              {
                createdAt: expect.any(Number),
                id: processId,
                input: 'World',
                state: 'running',
                process: {
                  spec: {
                    name: 'greet',
                  },
                },
              },
            ],
          });
        }

        if (n === 2) {
          const lines = message.toString().split('\n');
          expect(lines[0]).toEqual('event: delta');
          const data = extract(lines[1].toString());

          expect(data).toEqual({
            _t: 'a',
            0: {
              endedAt: [expect.any(Number)],
              output: ['Hello World!'],
              state: ['running', 'resolved'],
            },
          });

          done();
        }
      });

      greet('World')
        .pipe(
          map((process) => {
            processId = process.id;

            request(app)
              .get('/analyzer/query/spans/observe')
              .query({
                q: JSON.stringify({ v: { scope: { id: process.id } } }),
                deltas: true,
              })
              .pipe(fakeStream);

            return process;
          })
        )
        .pipe(chain(after(100)))
        .pipe(connector.run)
        .pipe(fork.toBackground);
    });
  });
});
