import { fluent } from 'mgfx/dist/utils/fluenture';
import { makeAnalyzer } from '@mgfx/analyzer';
import { ioTs, t } from '@mgfx/validator-iots';
import { promise, resolve, after, reject } from 'fluture';
import { localConnector, define, implement } from 'mgfx';
import { join } from 'path';
import { unlink as _unlink } from 'fs';
import { promisify } from 'util';

import { sqlite } from './index';

const unlink = promisify(_unlink);

const filename = join(__dirname, 'mgfx-analyzer.sql');

const connector = localConnector();

const add = implement(
  define({
    name: 'add',
    input: ioTs(t.tuple([t.number, t.number])),
    output: ioTs(t.number)
  }),
  ([a, b]) => after(10)(a + b)
);

const sum = implement(
  define({
    name: 'sum',
    input: ioTs(t.array(t.number)),
    output: ioTs(t.number)
  }),
  (xs, { runChild }) =>
    xs.reduce(
      (result, a) => result.chain(b => runChild(add([a, b]))),
      fluent<any, number>(resolve(0))
    )
);

const div = implement(
  define({
    name: 'div',
    input: ioTs(t.tuple([t.number, t.number])),
    output: ioTs(t.number)
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
    output: ioTs(t.number)
  }),
  (xs, { runChild }) =>
    runChild(sum(xs)).chain(sum => runChild(div([sum, xs.length])))
);

let shouldFail = false;
const couldFail = implement(
  define({
    name: 'couldFail',
    input: ioTs(t.any),
    output: ioTs(t.any)
  }),
  val => (shouldFail ? reject('nope') : val)
);

const analyzer = makeAnalyzer({ storage: sqlite({ filename }) });
connector.serveModule({ add, sum, div, avg, couldFail });
connector.use(analyzer.collector);

const ctx = connector.createContext({ isTest: true });

const tryCleanup = async () => {
  try {
    await unlink(filename);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
};

beforeAll(async () => {
  await tryCleanup();

  await ctx
    .run(avg([1, 2, 3]))
    .chain(after(100))
    .and(ctx.run(div([1, 0])).alt(resolve(undefined)))
    // Artificial wait for async. analysis to finish
    .chain(after(1000))
    .promise();
});

afterAll(async () => {
  await tryCleanup();
});

describe('query.spans', () => {
  it('selects all spans', async () => {
    const spans = await analyzer.query
      .spans({})
      .get()
      .pipe(promise);

    expect(spans).toHaveLength(7);
  });

  it('selects all spans in a given context', async () => {
    const ctxA = connector.createContext();
    const ctxB = connector.createContext();

    await ctxA
      .run(add([1, 1]))
      .and(ctxB.run(add([2, 2])))
      .chain(after(100))
      .promise();

    const spansA = await analyzer.query
      .spans({
        scope: {
          context: {
            id: ctxA.id
          }
        }
      })
      .get()
      .pipe(promise);

    const spansB = await analyzer.query
      .spans({
        scope: {
          context: {
            id: ctxB.id
          }
        }
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
            name: 'div'
          }
        }
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
            eq: [6, 3]
          }
        }
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
          state: 'rejected'
        }
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
            name: 'add'
          }
        },
        order: {
          field: 'createdAt',
          direction: 'asc'
        },
        limit: 2,
        offset: 1
      })
      .get()
      .pipe(promise);

    expect(spans[0].input).toEqual([2, 1]);
    expect(spans[1].input).toEqual([3, 3]);
  });

  it('selects all spans that descend from `id`', async () => {
    const [{ id }] = await analyzer.query
      .spans({
        scope: { spec: { name: 'avg' } }
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

    spans.forEach(span => {
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

    spans.forEach(span => {
      expect(span).not.toHaveProperty('input');
      expect(span).not.toHaveProperty('output');
      expect(span.context).not.toHaveProperty('values');
    });
  });

  describe('distinct operator', () => {
    it('supports `input`', async () => {
      await connector
        .run(couldFail(0))
        .chain(after(10))
        .promise();

      shouldFail = true;
      await connector
        .run(couldFail(0))
        .alt(resolve('ok'))
        .chain(after(10))
        .promise();

      const spans = await analyzer.query
        .spans({
          scope: { spec: { name: 'couldFail' } },
          order: { field: 'endedAt', direction: 'asc' },
          compact: true,
          distinct: 'input'
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
        .chain(after(10))
        .and(ctx.run(add([0, 1])))
        .chain(after(10))
        .promise();

      const spans = await analyzer.query
        .spans({
          scope: { spec: { name: 'add' }, context: { id: ctx.id } },
          order: { field: 'endedAt', direction: 'asc' },
          distinct: 'output'
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
        .chain(after(10))
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
              path: ['$.v[0]']
            }
          }
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
});
