import {
  resolve,
  promise,
  after,
  reject,
  rejectAfter,
  chain,
  go
} from 'fluture';

import { localConnector, define, implement, fork } from './index';
import { Validator } from './validator';
import { makeInstrumenter, Event } from './middleware/instrumenter';
import * as utils from './test-utils';

const mgFx = localConnector();

const validateAny: Validator<any> = resolve;
const validateVoid: Validator<void> = resolve;
const invalidateAny: Validator<any> = (value: unknown) =>
  reject(new Error(`Invalid data: ${value}`)) as any;

const withImplementation = utils.withImplementation(mgFx);
const withImplementations = utils.withImplementations(mgFx);

describe('run()', () => {
  it('runs synchronous Tasks', async () => {
    const syncGreet = implement(
      define({ name: 'syncGreet', input: validateAny, output: validateAny }),
      name => `Hello ${name}!`
    );

    const result = await withImplementation(syncGreet)(_ =>
      mgFx.run(syncGreet('World'))
    ).pipe(promise);

    expect(result).toBe('Hello World!');
  });

  it('runs asynchronous Tasks', async () => {
    const asyncGreet = implement(
      define({
        name: 'asyncGreet',
        input: validateAny,
        output: validateAny
      }),
      name => after(100)(`Hello ${name}!`)
    );

    const result = await withImplementation(asyncGreet)(_ =>
      mgFx.run(asyncGreet('World'))
    ).pipe(promise);

    expect(result).toBe('Hello World!');
  });

  it('handles synchronous Task failure', async () => {
    const syncFail = implement(
      define({ name: 'syncFail', input: validateVoid, output: validateVoid }),
      _ => {
        throw new Error('oops!');
      }
    );

    expect.assertions(1);
    try {
      await withImplementation(syncFail)(_ => mgFx.run(syncFail())).pipe(
        promise
      );
    } catch (err) {
      expect(err.message).toBe('oops!');
    }
  });

  it('handles asynchronous Task failure', async () => {
    const asyncFail = implement(
      define({ name: 'syncFail', input: validateVoid, output: validateVoid }),
      _ => rejectAfter(100)(new Error('oops!'))
    );

    expect.assertions(1);
    try {
      await withImplementation(asyncFail)(_ => mgFx.run(asyncFail())).pipe(
        promise
      );
    } catch (err) {
      expect(err.message).toBe('oops!');
    }
  });
});

describe('validation', () => {
  it('validates Task input', async () => {
    let called = false;

    const invalidInput = implement(
      define({
        name: 'invalidInput',
        input: invalidateAny,
        output: validateAny
      }),
      _ => (called = true)
    );

    expect.assertions(2);
    try {
      await withImplementation(invalidInput)(_ =>
        mgFx.run(invalidInput('hi!'))
      ).pipe(promise);
    } catch (err) {
      expect(err.errors).toBe('Invalid data: hi!');
    }

    expect(called).toBe(false);
  });

  it('validates Task output', async () => {
    const invalidOutput = implement(
      define({
        name: 'invalidInput',
        input: validateAny,
        output: invalidateAny
      }),
      name => after(100)(`Hello ${name}!`)
    );

    expect.assertions(1);
    try {
      await withImplementation(invalidOutput)(_ =>
        mgFx.run(invalidOutput('World'))
      ).pipe(promise);
    } catch (err) {
      expect(err.errors).toBe('Invalid data: Hello World!');
    }
  });
});

describe('context', () => {
  it('exposes Context values via `environment.context`', async () => {
    const greet = implement(
      define({
        name: 'greet',
        input: validateAny,
        output: validateAny,
        context: { greeting: validateAny }
      }),
      (name, environment) => `${environment.context.greeting} ${name}!`
    );

    const result = await withImplementation(greet)(_ => {
      const context = mgFx.createContext({
        greeting: 'Good morning'
      });

      return context.run(greet('World'));
    }).pipe(promise);

    expect(result).toBe('Good morning World!');
  });

  it('validates Context values', async () => {
    let called = false;
    const greet = implement(
      define({
        name: 'greet',
        input: validateAny,
        output: validateAny,
        context: { greeting: invalidateAny }
      }),
      _ => (called = true)
    );

    expect.assertions(3);
    try {
      await withImplementation(greet)(_ => {
        const context = mgFx.createContext({
          greeting: 'Good morning'
        });

        return context.run(greet('World'));
      }).pipe(promise);
    } catch (err) {
      expect(err.errors).toBe('Invalid data: Good morning');
      expect(err.contextKey).toBe('greeting');
    }

    expect(called).toBe(false);
  });

  it('merges hierarchical context values', async () => {
    const greet = implement(
      define({
        name: 'greet',
        input: validateAny,
        output: validateAny,
        context: { greeting: validateAny }
      }),
      (name, environment) => `${environment.context.greeting} ${name}!`
    );

    const result = await withImplementation(greet)(_ => {
      const morning = mgFx.createContext({
        greeting: 'Good morning'
      });

      const afternoon = morning.createChild({
        greeting: 'Good afternoon'
      });

      return afternoon.run(greet('World'));
    }).pipe(promise);

    expect(result).toBe('Good afternoon World!');
  });
});

const sum = implement(
  define({
    name: 'sum',
    input: validateAny,
    output: validateAny
  }),
  (xs: number[]) => xs.reduce((total, x) => total + x, 0)
);

const div = implement(
  define({
    name: 'div',
    input: validateAny,
    output: validateAny
  }),
  ([a, b]) => a / b
);

const average = implement(
  define({
    name: 'average',
    input: validateAny,
    output: validateAny
  }),
  (xs: number[], environment) =>
    environment
      .runChild(sum(xs))
      .pipe(chain(sum => environment.runChild(div([sum, xs.length]))))
);

describe('runChild', () => {
  it('runs another Task as a child', async () => {
    const result = await withImplementations({ sum, div, average })(_ => {
      return mgFx.run(average([4, 8, 15, 16, 23, 42]));
    }).pipe(promise);

    expect(result).toBe(18);
  });
});

describe('instrumentation', () => {
  let log: Event[] = [];

  beforeAll(() => {
    const logger = makeInstrumenter({
      receiver: event => log.push(event)
    });

    mgFx.use(logger);
  });

  beforeEach(() => {
    log = [];
  });

  it('sends all events to a receiver function', async () => {
    await withImplementations({ sum, div, average })(_ => {
      return mgFx.run(average([4, 8, 15, 16, 23, 42]));
    }).pipe(promise);

    expect(log).toHaveLength(6);

    expect(log[0].kind).toBe('process');
    expect((log[0] as any).process.spec.name).toBe('average');
    expect((log[0] as any).process.input).toEqual([4, 8, 15, 16, 23, 42]);
    expect((log[0] as any).process.parentId).toBe(undefined);

    expect(log[1].kind).toBe('process');
    expect((log[1] as any).process.spec.name).toBe('sum');
    expect((log[1] as any).process.input).toEqual([4, 8, 15, 16, 23, 42]);
    expect((log[1] as any).process.parentId).toBe((log[0] as any).process.id);

    expect(log[2].kind).toBe('resolution');
    expect((log[2] as any).id).toBe((log[1] as any).process.id);
    expect((log[2] as any).value).toBe(108);
  });

  it('sends rejections to a receiver function', async () => {
    const brokenDiv = implement(div, ([a, b]) => {
      throw new Error('oops');
    });

    try {
      await withImplementations({ sum, brokenDiv, average })(_ => {
        return mgFx.run(average([4, 8, 15, 16, 23, 42]));
      }).pipe(promise);
    } catch (err) {}

    expect(log[4].kind).toBe('rejection');
    expect((log[4] as any).reason.message).toBe('oops');
  });

  it('sends cancellations to a receiver function', async () => {
    const slowSum = implement(sum, (xs: number[]) =>
      after(100)(xs.reduce((total, x) => total + x, 0))
    );

    await withImplementations({ slowSum, div, average })(_ =>
      go(function*() {
        const cancel = mgFx.run(average([1, 2, 3])).pipe(fork.toBackground);

        yield after(50)(undefined);
        cancel();
      })
    ).pipe(promise);

    expect(log).toHaveLength(4);
    expect(log[2].kind).toBe('cancellation');
    expect((log[2] as any).id).toBe((log[1] as any).process.id);
    expect(log[3].kind).toBe('cancellation');
    expect((log[3] as any).id).toBe((log[0] as any).process.id);
  });
});

describe('local connector', () => {
  it(`throws an error when running a Task that isn't being served`, async () => {
    expect.assertions(1);
    try {
      await mgFx.run(sum([1, 2, 3])).pipe(promise);
    } catch (err) {
      expect(err.name).toBe('NoImplementationError');
    }
  });
});
