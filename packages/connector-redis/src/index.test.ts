import { ioTs, t } from '@mgfx/validator-iots';
import { parallel, map, promise, reject, after, fork } from 'fluture';
import { define, implement } from 'mgfx';
import { tapCancellation } from 'mgfx/dist/utils';

import { redis } from './index';

const mgFx = redis();

const fib = define({
  name: 'fib',
  input: ioTs(t.number),
  output: ioTs(t.number)
});

mgFx.serve(
  implement(fib, (n, { runChild }) => {
    if (n <= 1) {
      return 1;
    }

    return parallel(2)([runChild(fib(n - 1)), runChild(fib(n - 2))]).pipe(
      map(([a, b]) => a + b)
    );
  })
);

const fail = implement(
  define({
    name: 'fail',
    input: ioTs(t.void),
    output: ioTs(t.void)
  }),
  () => reject(new Error('oh no'))
);

const noop = implement(
  define({
    name: 'noop',
    input: ioTs(t.void),
    output: ioTs(t.void)
  }),
  () => undefined
);

let cancelled = false;
const cancellable = implement(
  define({
    name: 'cancellable',
    input: ioTs(t.void),
    output: ioTs(t.boolean)
  }),
  () =>
    after(1000)(true).pipe(
      tapCancellation(() => {
        cancelled = true;
      })
    )
);

mgFx.serveModule({ fail, noop, cancellable });

it('invokes and resolves Task dispatches', async () => {
  const result = await mgFx.run(fib(10)).pipe(promise);
  expect(result).toBe(89);
});

it('handles Tasks that fail', async () => {
  await expect(mgFx.run(fail()).pipe(promise)).rejects.toEqual(
    new Error('oh no')
  );
});

it('handles Tasks that are void of input/output', async () => {
  const result = await mgFx.run(noop()).pipe(promise);
  expect(result).toBe(undefined);
});

it('propagates cancellation signal', done => {
  const runSilently = fork(() => {})(() => {});
  const cancel = mgFx.run(cancellable()).pipe(runSilently);
  setTimeout(() => {
    cancel();
  }, 100);

  const pollForCancellation = setInterval(() => {
    if (cancelled === true) {
      clearInterval(pollForCancellation);
      done();
    }
  }, 100);
});

afterEach(() => {
  cancelled = false;
});

afterAll(() => {
  mgFx.shutdown();
});
