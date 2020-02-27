import {
  FutureInstance,
  Future,
  isFuture,
  lastly,
  race,
  resolve
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
