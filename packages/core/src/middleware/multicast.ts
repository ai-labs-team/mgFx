import { parallel } from 'fluture';

import { MiddlewareFn } from '../connector';
import { fluent } from '../utils/fluenture';
import { joinWith, toEither } from '../utils';

/**
 * A higher-order Middleware function that provides a 'multicast' mechanism, sending the same Process information to
 * multiple Middleware functions _in parallel_.
 *
 * However, any Middleware functions applied in this manner will have no effect on the dispatch process. Therefore,
 * this function is most useful in combination with Instrumentation middleware.
 */
export const multicast = (middlewares: MiddlewareFn[]): MiddlewareFn => (
  process,
  next
) => {
  // To prevent any downstream middlewares from `.fork()`ing the same Future twice, we use `.cache()`.
  const originalDispatch = next(process).pipe(fluent).cache();

  // Downstream middlewares are given a 'fake' continuation function that returns the cached dispatch.
  const fakeNext = () => originalDispatch;

  const multicastDispatches = middlewares
    // Each of the multicast dispatches is coalesced to an Either;
    // This prevents rejections on any branch from cancelling the other branches.
    .map((middleware) => middleware(process, fakeNext).pipe(toEither));

  // Finally, we run the multicast in parallel with the original dispatch;
  // `joinWith` is used to ensure that both sides settle but returning the original dispatch.
  return originalDispatch.pipe(joinWith(all(multicastDispatches)));
};

const all = parallel(Infinity);
