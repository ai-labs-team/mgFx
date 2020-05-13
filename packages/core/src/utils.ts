import {
  FutureInstance,
  Future,
  isFuture,
  lastly,
  race,
  resolve,
  coalesce,
  reject,
  both,
  chain,
  map,
} from 'fluture';

/**
 * Coerces a non-Future into a Future that resolves to that value. If the value is already a Future, it is returned
 * as-is.
 */
export const toFuture = <T extends any>(
  value: T | FutureInstance<any, T>
): FutureInstance<any, T> =>
  isFuture(value)
    ? (value as FutureInstance<any, T>)
    : (resolve(value) as FutureInstance<any, T>);

export const tapCancellation = <T extends FutureInstance<any, any>>(
  onCancel: () => void
) => (future: T) => {
  let settled = false;

  const onSettled = Future<any, any>((reject, resolve) => {
    settled = true;
    resolve(undefined);

    return () => {};
  });

  const onCancelled = Future(() => {
    return () => {
      if (!settled) {
        onCancel();
      }
    };
  });

  return future.pipe(lastly(onSettled)).pipe(race(onCancelled)) as T;
};

/**
 * A minimal implementation of an Either type, for use in conjunction with the coalesce operators
 */
export type Either<L, R> = { left: L } | { right: R };

const toLeft = <T>(left: T): Either<T, any> => ({ left });
const toRight = <T>(right: T): Either<any, T> => ({ right });

/**
 * Transforms a Future that may reject into a Future that always resolves to an Either that contains the rejection
 * reason or resolution value.
 */
export const toEither = coalesce(toLeft)(toRight) as <L, R>(
  future: FutureInstance<L, R>
) => FutureInstance<never, Either<L, R>>;

/**
 * The opposite of `toEither`; transforms a Future that may resolve to an Either into a Future that may reject with the
 * Either's 'left' value, or resolve with the Either's 'right' value.
 */
export const fromEither = chain((either: Either<any, any>) =>
  'left' in either ? reject(either.left) : resolve(either.right)
) as <L0, L, R>(
  future: FutureInstance<L0, Either<L, R>>
) => FutureInstance<L0 | L, R>;

/**
 * Joins two Futures so that they run in parallel, but a rejection in either will not cause the other to be cancelled.
 *
 * Waits for both Futures to settle, but the second Future is used to determine the outcome of the Future that is
 * returned.
 */
export const joinWith = <L1, R1, L2, R2>(f1: FutureInstance<L1, R1>) => (
  f2: FutureInstance<L2, R2>
) =>
  f1
    .pipe(toEither)
    .pipe(both(f2.pipe(toEither)))
    .pipe(map((results) => results[0]))
    .pipe(fromEither);
