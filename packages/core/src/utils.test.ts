import { after, race, promise, map, rejectAfter, resolve } from 'fluture';

import * as utils from './utils';

describe('toFuture()', () => {
  it('returns the original Future', () => {
    const f = after(100)('test');
    expect(utils.toFuture(f)).toBe(f);
  });

  it('returns a Future wrapping a non-Future', async () => {
    const f = 'test';
    await expect(utils.toFuture(f).pipe(promise)).resolves.toBe(f);
  });
});

describe('tapCancellation', () => {
  it('does not modify resolved value', async () => {
    const f = after(100)('test').pipe(utils.tapCancellation(() => {}));
    await expect(f.pipe(promise)).resolves.toBe('test');
  });

  it('does not modify rejection reason', async () => {
    const f = rejectAfter(100)(new Error('oh no')).pipe(
      utils.tapCancellation(() => {})
    );
    await expect(f.pipe(promise)).rejects.toEqual(new Error('oh no'));
  });

  it('calls the provided handler when cancelled', async () => {
    let wasCancelled = false;

    await after(100)('test')
      .pipe(
        utils.tapCancellation(() => {
          wasCancelled = true;
        })
      )
      .pipe(race(after(10)(undefined) as any))
      .pipe(promise);

    expect(wasCancelled).toBe(true);
  });
});

describe('toEither', () => {
  it('coalesces a rejected Future as an Either', async () => {
    const f = rejectAfter(100)(new Error('oh no')).pipe(utils.toEither);
    await expect(f.pipe(promise)).resolves.toEqual({
      left: new Error('oh no'),
    });
  });

  it('coalesces a resolved Future as an Either', async () => {
    const f = after(100)('test').pipe(utils.toEither);

    await expect(f.pipe(promise)).resolves.toEqual({
      right: 'test',
    });
  });
});

describe('fromEither', () => {
  it('creates a Future that rejects from the left value', async () => {
    const f = utils.fromEither(resolve({ left: new Error('oh no') }));
    await expect(f.pipe(promise)).rejects.toEqual(new Error('oh no'));
  });

  it('creates a Future that resolves from the right value', async () => {
    const f = utils.fromEither(
      resolve({ right: 'test' } as utils.Either<any, any>)
    );
    await expect(f.pipe(promise)).resolves.toEqual('test');
  });
});

describe('joinWith', () => {
  it('runs both Futures concurrently and resolves with the first value', async () => {
    const done: string[] = [];

    const f1 = after(10)('f1').pipe(
      map((r) => {
        done.push(r);
        return r;
      })
    );

    const f2 = after(20)('f2').pipe(
      map((r) => {
        done.push(r);
        return r;
      })
    );

    await expect(f1.pipe(utils.joinWith(f2)).pipe(promise)).resolves.toBe('f1');
    expect(done).toEqual(['f1', 'f2']);
  });

  it('rejects with the first reason but allows the second to continue', async () => {
    const f1 = rejectAfter(10)(new Error('f1'));

    let done = false;
    const f2 = after(20)('f2').pipe(
      map((r) => {
        done = true;
        return r;
      })
    );

    await expect(f1.pipe(utils.joinWith(f2)).pipe(promise)).rejects.toEqual(
      new Error('f1')
    );

    expect(done).toBe(true);
  });

  it('resolves with the first value even if the second rejects', async () => {
    const f1 = after(10)('f1');
    const f2 = rejectAfter(20)(new Error('f1'));

    await expect(f1.pipe(utils.joinWith(f2)).pipe(promise)).resolves.toBe('f1');
  });
});
