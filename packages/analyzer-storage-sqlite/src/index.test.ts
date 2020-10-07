import { fluent } from 'mgfx/dist/utils/fluenture';
import { makeAnalyzer } from '@mgfx/analyzer';
import { ioTs, t } from '@mgfx/validator-iots';
import { Cancel, promise, resolve, after, reject } from 'fluture';
import { localConnector, define, fork, implement } from 'mgfx';
import { join } from 'path';
import { unlink as _unlink } from 'fs';
import { promisify } from 'util';
import { uuid } from 'uuidv4';

import { sqlite } from './index';

const unlink = promisify(_unlink);

const add = implement(
  define({
    name: 'add',
    input: ioTs(t.tuple([t.number, t.number])),
    output: ioTs(t.number),
  }),
  ([a, b]) => after(10)(a + b)
);

const sum = implement(
  define({
    name: 'sum',
    input: ioTs(t.array(t.number)),
    output: ioTs(t.number),
  }),
  (xs, { runChild }) =>
    xs.reduce(
      (result, a) => result.chain((b) => runChild(add([a, b]))),
      fluent<any, number>(resolve(0))
    )
);

const div = implement(
  define({
    name: 'div',
    input: ioTs(t.tuple([t.number, t.number])),
    output: ioTs(t.number),
  }),
  ([a, b]) => {
    if (b === 0) {
      throw new Error('Division by zero');
    }

    return a / b;
  }
);

const avg = implement(
  define({
    name: 'avg',
    input: ioTs(t.array(t.number)),
    output: ioTs(t.number),
  }),
  (xs, { runChild }) =>
    runChild(sum(xs)).chain((sum) => runChild(div([sum, xs.length])))
);

let shouldFail = false;
const couldFail = implement(
  define({
    name: 'couldFail',
    input: ioTs(t.any),
    output: ioTs(t.any),
  }),
  (val) => (shouldFail ? reject('nope') : val)
);

const prepareSuite = (name: string) => {
  const filename = join(__dirname, `mgfx-analyzer-${name}.sqlite`);

  const tryCleanup = async () => {
    try {
      await Promise.all([
        unlink(filename),
        unlink(`${filename}-shm`),
        unlink(`${filename}-wal`),
      ]);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  };

  beforeAll(tryCleanup);
  afterAll(tryCleanup);

  return filename;
};

const connector = localConnector();
const analyzer = makeAnalyzer({
  storage: sqlite({ filename: prepareSuite('default') }),
  retention: {
    maxAge: 10_000,
    checkInterval: 100
  }
});
connector.serveModule({ add, sum, div, avg, couldFail });
connector.use(analyzer.collector);

const ctx = connector.createContext({ isTest: true });

describe('query.spans', () => {
  let stopRetention: Cancel;

  beforeAll(async () => {
    stopRetention = analyzer.retention.pipe(fork.toConsole);

    await ctx
      .run(avg([1, 2, 3]))
      .chain(after(100))
      .and(ctx.run(div([1, 0])).alt(resolve(undefined)))
      .promise();
  });

  afterAll(() => {
    stopRetention();
  });

  it('selects all spans', async () => {
    const spans = await analyzer.query.spans({}).get().pipe(promise);

    expect(spans).toHaveLength(7);
  });

  it('selects all spans in a given context', async () => {
    const ctxA = connector.createContext();
    const ctxB = connector.createContext();

    await ctxA
      .run(add([1, 1]))
      .and(ctxB.run(add([2, 2])))
      .promise();

    const spansA = await analyzer.query
      .spans({
        scope: {
          context: {
            id: ctxA.id,
          },
        },
      })
      .get()
      .pipe(promise);

    const spansB = await analyzer.query
      .spans({
        scope: {
          context: {
            id: ctxB.id,
          },
        },
      })
      .get()
      .pipe(promise);

    expect(spansA).toHaveLength(1);
    expect(spansA[0].input).toEqual([1, 1]);

    expect(spansB).toHaveLength(1);
    expect(spansB[0].input).toEqual([2, 2]);
  });

  it('selects spans matching spec name', async () => {
    const spans = await analyzer.query
      .spans({
        scope: {
          spec: {
            name: 'div',
          },
        },
      })
      .get()
      .pipe(promise);

    expect(spans).toHaveLength(2);
  });

  it('selects spans matching input', async () => {
    const spans = await analyzer.query
      .spans({
        scope: {
          input: {
            eq: [6, 3],
          },
        },
      })
      .get()
      .pipe(promise);

    expect(spans).toHaveLength(1);
    expect(spans[0].process.spec.name).toBe('div');
    expect(spans[0].input).toEqual([6, 3]);
    expect((spans[0] as any).output).toEqual(2);
  });

  it('selects spans matching state', async () => {
    const spans = await analyzer.query
      .spans({
        scope: {
          state: 'rejected',
        },
      })
      .get()
      .pipe(promise);

    expect(spans).toHaveLength(1);
    expect(spans[0].process.spec.name).toBe('div');
  });

  it('applies an order, limit and offset', async () => {
    const spans = await analyzer.query
      .spans({
        scope: {
          spec: {
            name: 'add',
          },
        },
        order: {
          field: 'createdAt',
          direction: 'asc',
        },
        limit: 2,
        offset: 1,
      })
      .get()
      .pipe(promise);

    expect(spans[0].input).toEqual([2, 1]);
    expect(spans[1].input).toEqual([3, 3]);
  });

  it('selects all spans that descend from `id`', async () => {
    const [{ id }] = await analyzer.query
      .spans({
        scope: { spec: { name: 'avg' } },
      })
      .get()
      .pipe(promise);

    const spans = await analyzer.query
      .spans({ scope: { id } })
      .get()
      .pipe(promise);

    expect(spans).toHaveLength(6);
  });

  it('omits values if `compact` parameter is specified', async () => {
    const spans = await analyzer.query
      .spans({ compact: true })
      .get()
      .pipe(promise);

    spans.forEach((span) => {
      expect(span).not.toHaveProperty('input');
      expect(span).not.toHaveProperty('output');
      expect(span.context).not.toHaveProperty('values');
    });
  });

  it('correctly handles `compact: true` and `scope.input.eq`', async () => {
    const spans = await analyzer.query
      .spans({ compact: true, scope: { input: { eq: [2, 1] } } })
      .get()
      .pipe(promise);

    spans.forEach((span) => {
      expect(span).not.toHaveProperty('input');
      expect(span).not.toHaveProperty('output');
      expect(span.context).not.toHaveProperty('values');
    });
  });

  describe('distinct operator', () => {
    it('supports `input`', async () => {
      await connector.run(couldFail(0)).chain(after(10)).promise();

      shouldFail = true;
      await connector.run(couldFail(0)).alt(resolve('ok')).promise();

      const spans = await analyzer.query
        .spans({
          scope: { spec: { name: 'couldFail' } },
          order: { field: 'endedAt', direction: 'asc' },
          compact: true,
          distinct: 'input',
        })
        .get()
        .pipe(promise);

      expect(spans).toHaveLength(1);
      expect(spans[0].state).toBe('rejected');
    });

    it('supports `output`', async () => {
      const ctx = connector.createContext();

      await ctx
        .run(add([1, 0]))
        .and(ctx.run(add([0, 1])))
        .promise();

      const spans = await analyzer.query
        .spans({
          scope: { spec: { name: 'add' }, context: { id: ctx.id } },
          order: { field: 'endedAt', direction: 'asc' },
          distinct: 'output',
        })
        .get()
        .pipe(promise);

      expect(spans).toHaveLength(1);
      expect(spans[0].input).toEqual([0, 1]);
    });

    it('supports `input.path`', async () => {
      const ctx = connector.createContext();

      await ctx
        .run(div([2, 1]))
        .and(ctx.run(div([1, 1])))
        .chain(after(10))
        .and(ctx.run(div([1, 0])))
        .alt(resolve(undefined))
        .chain(after(10))
        .promise();

      const spans = await analyzer.query
        .spans({
          scope: { spec: { name: 'div' }, context: { id: ctx.id } },
          order: { field: 'endedAt', direction: 'asc' },
          distinct: {
            input: {
              path: ['$.v[0]'],
            },
          },
        })
        .get()
        .pipe(promise);

      expect(spans).toHaveLength(2);
      expect(spans[0].input).toEqual([2, 1]);
      expect(spans[0].state).toBe('resolved');

      expect(spans[1].input).toEqual([1, 0]);
      expect(spans[1].state).toBe('rejected');
    });
  });

  it('uses liveness threshold to determine dead spans', async () => {
    const id = uuid();
    const timestamp = Date.now() - (5 * 60_000);

    analyzer.receiver({
      timestamp,
      kind: 'process',
      process: {
        id,
        input: undefined,
        spec: {
          name: 'fake-test',
        },
      },
    });

    analyzer.receiver({
      timestamp: timestamp + 60_000,
      kind: 'heartbeat',
      id
    })

    await after(100)(undefined).pipe(promise);

    const resultA = await analyzer.query
      .spans({ scope: { id } })
      .get()
      .pipe(promise);

    expect(resultA[0].state).toBe('dead');
    expect((resultA[0] as any).heartbeat).toEqual({ last: timestamp + 60_000 });
    expect((resultA[0] as any).endedAt).toEqual(timestamp + 150_000);

    const resultB = await analyzer.query
      .spans({ scope: { id }, heartbeat: { livenessThreshold: 10 * 60_000 } })
      .get()
      .pipe(promise);

    expect(resultB[0].state).toBe('running');
  });

  it('removes spans older than retention max age', async () => {
    const now = Date.now();
    const id = uuid();

    analyzer.receiver({
      kind: 'process',
      timestamp: now - 10_500,
      process: {
        id,
        spec: {
          name: 'test'
        },
        input: undefined
      }
    });

    analyzer.receiver({
      kind: 'resolution',
      timestamp: now - 10_000,
      value: undefined,
      id,
    });

    await after(100)(undefined).pipe(promise);
    const a = await analyzer.query.spans({}).get().pipe(promise);
    expect(a.find(span => span.id === id)).toBeDefined();

    await after(1000)(undefined).pipe(promise);
    const b = await analyzer.query.spans({}).get().pipe(promise);
    expect(b.find(span => span.id === id)).toBeUndefined();
  });
});

describe('buffered mode', () => {
  const bufferedAnalyzer = makeAnalyzer({
    storage: sqlite({ filename: prepareSuite('buffered') }),
    buffer: { enabled: true },
  });

  const bufferedConnector = localConnector();
  bufferedConnector.use(bufferedAnalyzer.collector);
  bufferedConnector.serveModule({ add });

  it('supports writing events in buffered mode', (done) => {
    let updateCount = 0;
    bufferedAnalyzer.query
      .spans({})
      .watch()
      .observe((spans) => {
        updateCount += 1;
        if (spans.length === 0) {
          return;
        }

        expect(updateCount).toBe(2);
        done();
      });

    bufferedConnector
      .run(add([1, 2]))
      .and(bufferedConnector.run(add([3, 4])))
      .and(bufferedConnector.run(add([5, 6])))
      .and(bufferedConnector.run(add([7, 8])))
      .promise();
  });

  afterAll(() => {
    bufferedAnalyzer.receiver.shutdown();
  });
});
