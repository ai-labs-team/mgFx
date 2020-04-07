import { ioTs, t } from '@mgfx/validator-iots';
import { localConnector, define, implement } from 'mgfx';
import { Event } from 'mgfx/dist/middleware/instrumenter';
import { resolve, promise, after } from 'fluture';

import { makeAnalyzer, Span, Storage } from './index';

const connector = localConnector();

let events: any[] = [];
let spans: any[] = [];

const storage: Storage = {
  put: {
    event: (event) => {
      events.push(event);

      if (event.kind === 'process') {
        spans = [...spans, { id: event.process.id, state: 'running' }];
      }

      if (event.kind === 'resolution') {
        const index = spans.findIndex((span) => span.id === event.id);
        spans = [
          ...spans.slice(0, index),
          { ...spans[index], state: 'resolved' },
          ...spans.slice(index + 1),
        ];
      }

      return resolve(undefined);
    },
  },
  query: {
    spans: (query) => {
      return resolve(spans);
    },
  },
};

beforeEach(() => {
  events = [];
  spans = [];
});

const add = implement(
  define({
    name: 'add',
    input: ioTs(t.tuple([t.number, t.number])),
    output: ioTs(t.number),
  }),
  ([a, b]) => a + b
);

connector.serve(add);

const analyzer = makeAnalyzer({
  storage: resolve(storage),
});

connector.use(analyzer.collector);

describe('collector', () => {
  it('sends events to `storage.put.event`', async () => {
    await add([1, 2]).pipe(connector.run).pipe(promise);

    expect(events).toHaveLength(2);
    expect(events[0].kind).toBe('process');
    expect((events[0] as any).process.spec.name).toBe('add');
    expect((events[0] as any).process.input).toEqual([1, 2]);
  });
});

describe('query.spans.get', () => {
  it('returns a list of stored Spans', async () => {
    await add([1, 2]).pipe(connector.run).pipe(promise);

    const spans = await analyzer.query.spans({}).get().pipe(promise);

    expect(spans).toHaveLength(1);
    expect(spans[0].state).toBe('resolved');
  });
});

describe('query.spans.watch', () => {
  it('emits the initial list of stored Spans, and every change that occurs', async () => {
    const log: Span[][] = [];

    const observer = analyzer.query
      .spans({})
      .watch()
      .observe((value) => {
        log.push(value);
      });

    await add([1, 2]).pipe(connector.run).pipe(promise);

    expect(log).toHaveLength(3);
    expect(log[1]).toHaveLength(1);
    expect(log[1][0].state).toBe('running');
    expect(log[2]).toHaveLength(1);
    expect(log[2][0].state).toBe('resolved');

    observer.unsubscribe();
  });
});

describe('buffering', () => {
  const buffer: Event[][] = [];

  const bufferedConnector = localConnector();

  const bufferedAnalyzer = makeAnalyzer({
    buffer: {
      enabled: true,
    },
    storage: resolve({
      ...storage,
      put: {
        ...storage.put,
        events: (events) => {
          buffer.push(events);
          return resolve(undefined);
        },
      },
    }),
  });

  bufferedConnector.use(bufferedAnalyzer.collector);
  bufferedConnector.serveModule({ add });

  it('buffers incoming events and flushes them to Storage in batches', async () => {
    expect.assertions(5);

    await bufferedConnector
      .run(add([1, 2]))
      .and(bufferedConnector.run(add([3, 4])))
      .map(() => {
        expect(buffer).toHaveLength(0);
      })
      .chain(after(250))
      .map(() => {
        expect(buffer).toHaveLength(1);
        expect(buffer[0]).toHaveLength(4);
      })
      .chain(after(250))
      .map(() => {
        expect(buffer).toHaveLength(1);
        expect(buffer[0]).toHaveLength(4);
      })
      .promise();
  });

  it('updates each observer once per flush', async () => {
    let updates = 0;

    bufferedAnalyzer.query
      .spans({})
      .watch()
      .observe(() => (updates += 1));

    await bufferedConnector
      .run(add([1, 2]))
      .and(bufferedConnector.run(add([3, 4])))
      .chain(after(100))
      .promise();

    expect(updates).toBe(1);
  });
});
