import { makeAnalyzer } from '@mgfx/analyzer';
import { ioTs, t } from '@mgfx/validator-iots';
import { chain, promise, resolve, FutureInstance, after } from 'fluture';
import { localConnector, define, implement } from 'mgfx';
import { join } from 'path';
import { unlink as _unlink } from 'fs';
import { promisify, inspect } from 'util';

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
      (result, a) => result.pipe(chain(b => runChild(add([a, b])))),
      resolve(0) as FutureInstance<any, number>
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
    runChild(sum(xs)).pipe(chain(sum => runChild(div([sum, xs.length]))))
);

const analyzer = makeAnalyzer({ storage: sqlite({ filename }) });
connector.serveModule({ add, sum, div, avg });
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
  await ctx.run(avg([1, 2, 3])).pipe(promise);
  try {
    await ctx.run(div([1, 0])).pipe(promise);
  } catch {}

  // Artificial wait for async. analysis to finish
  await after(1000)(undefined).pipe(promise);
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
      expect(span).not.toHaveProperty('value');
      expect(span).not.toHaveProperty('reason');
      expect(span.context).not.toHaveProperty('values');
    });
  });
});
