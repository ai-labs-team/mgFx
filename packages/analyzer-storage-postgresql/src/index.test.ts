import { fluent } from 'mgfx/dist/utils/fluenture';
import { makeAnalyzer } from '@mgfx/analyzer';
import { ioTs, t } from '@mgfx/validator-iots';
import { promise, resolve, after, reject } from 'fluture';
import { localConnector, define, implement } from 'mgfx';
import { uuid } from 'uuidv4';

import { postgresql } from './index';

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

const connector = localConnector();
const storage = postgresql({
    database: process.env.POSTGRES_URL || 'postgres://postgres:password@localhost/mgfx',
    migrations: {
      force: true
    },
});

const analyzer = makeAnalyzer({ storage });

connector.serveModule({ add, sum, div, avg, couldFail });
connector.use(analyzer.collector);

const ctx = connector.createContext({ isTest: true });

describe('query.spans', () => {
  beforeAll(async () => {
    await ctx
      .run(avg([1, 2, 3]))
      .chain(after(100))
      .and(ctx.run(div([1, 0])).alt(resolve(undefined)))
      .chain(after(1000))
      .promise();
  });

  it('selects all spans', async () => {
    const spans = await analyzer.query.spans({}).get().pipe(promise);

    expect(spans).toHaveLength(7);
  });

  it('does not select partial spans', async () => {
    const id = uuid();
    analyzer.receiver({
      kind: 'resolution',
      value: 'test',
      timestamp: Date.now(),
      id
    });

    await after(100)(undefined).pipe(promise);

    const result = await analyzer.query.spans({ scope: { id } }).get().pipe(promise);

    expect(result).toEqual([]);
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

  it('selects all spans that descend from `id` with `limit`', async () => {
    const [{ id }] = await analyzer.query
      .spans({
        scope: { spec: { name: 'avg' } },
      })
      .get()
      .pipe(promise);

    const spans = await analyzer.query
      .spans({ scope: { id }, limit: 3 })
      .get()
      .pipe(promise);

    expect(spans).toHaveLength(3);
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

  it('correctly distinguishes between `undefined` and `null` in input/output', async () => {
    const ctx = connector.createContext();

    await ctx
      .run(couldFail(undefined))
      .chain(after(10))
      .and(ctx.run(couldFail(null)))
      .chain(after(10))
      .promise();

    const spans = await analyzer.query
      .spans({
        scope: { spec: { name: 'couldFail' }, context: { id: ctx.id } },
      })
      .get()
      .pipe(promise);

    expect(spans[0].input).toBe(undefined);
    expect((spans[0] as any).output).toBe(undefined);
    expect(spans[1].input).toBe(null);
    expect((spans[1] as any).output).toBe(null);
  });

  describe('distinct operator', () => {
    it('supports `input`', async () => {
      const ctx = connector.createContext();

      await ctx.run(couldFail(0)).chain(after(10)).promise();

      shouldFail = true;
      await ctx.run(couldFail(0)).alt(resolve('ok')).chain(after(10)).promise();

      const spans = await analyzer.query
        .spans({
          scope: { spec: { name: 'couldFail' }, context: { id: ctx.id } },
          order: { field: 'endedAt', direction: 'desc' },
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
        .chain(after(10))
        .promise();

      const spans = await analyzer.query
        .spans({
          scope: { spec: { name: 'add' }, context: { id: ctx.id } },
          order: { field: 'endedAt', direction: 'desc' },
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
          order: { field: 'endedAt', direction: 'desc' },
          distinct: {
            input: {
              path: ['0'],
            },
          },
        })
        .get()
        .pipe(promise);

      expect(spans).toHaveLength(2);
      expect(spans[1].input).toEqual([2, 1]);
      expect(spans[1].state).toBe('resolved');

      expect(spans[0].input).toEqual([1, 0]);
      expect(spans[0].state).toBe('rejected');
    });
  });
});

describe('buffered mode', () => {
  const bufferedAnalyzer = makeAnalyzer({
    storage: postgresql({
      database: process.env.POSTGRES_URL || 'postgres://postgres:password@localhost/mgfx',
      migrations: {
        force: true,
      },
    }),
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

        if (updateCount === 2) {
          done();
        }
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