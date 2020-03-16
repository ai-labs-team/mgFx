import { makeAnalyzer } from '@mgfx/analyzer';
import { httpServer } from '@mgfx/analyzer-http-server';
import { sqlite } from '@mgfx/analyzer-storage-sqlite';
import { ioTs, t } from '@mgfx/validator-iots';
import express from 'express';
import { after, promise } from 'fluture';
import fetch from 'node-fetch';
import { Server } from 'http';
import { unlink as _unlink } from 'fs';
import { promisify } from 'util';
import EventSource from 'eventsource';

import { define, implement, localConnector } from 'mgfx';

import { httpClient } from './';

const unlink = promisify(_unlink);

Object.assign(global, { fetch, EventSource });

const app = express();
const connector = localConnector();
const analyzer = makeAnalyzer({ storage: sqlite({}) });
const client = httpClient({ baseUrl: 'http://localhost:8080' });

connector.use(analyzer.collector);
app.use(httpServer({ analyzer }));

const add = implement(
  define({
    name: 'add',
    input: ioTs(t.tuple([t.number, t.number])),
    output: ioTs(t.number)
  }),
  ([a, b]) => after(100)(a + b)
);

connector.serve(add);

const start = () =>
  new Promise<Server>((resolve, reject) => {
    const server = app.listen(8080, err => {
      err ? reject(err) : resolve(server);
    });
  });

const stop = (server: Server) =>
  new Promise((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()));
  });

let server: Server;

beforeAll(async () => {
  server = await start();
  await connector.run(add([1, 2])).pipe(promise);
});

afterAll(async () => {
  await stop(server);
  await unlink('mgfx-analyzer.sqlite');
});

it('performs a `get` query', async () => {
  const result = await client.query
    .spans({})
    .get()
    .pipe(promise);

  expect(result).toHaveLength(1);
  expect(result[0].process.spec.name).toBe('add');
  expect(result[0].input).toEqual([1, 2]);
  expect(result[0].state).toBe('resolved');
  expect((result[0] as any).value).toBe(3);
});

it('performs a `watch` query', async () => {
  const result = await client.query
    .spans({})
    .watch()
    .take(1)
    .toPromise();

  expect(result).toHaveLength(1);
  expect(result[0].process.spec.name).toBe('add');
  expect(result[0].input).toEqual([1, 2]);
  expect(result[0].state).toBe('resolved');
  expect((result[0] as any).value).toBe(3);
});
