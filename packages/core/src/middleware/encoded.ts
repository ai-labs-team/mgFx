import { resolve } from 'fluture';

import { MiddlewareFn } from '../connector';
import { InputValidationError } from '../validator';
import { fluent } from '../utils/fluenture';
import { joinWith } from '../utils';

/**
 * A higher-order Middleware function that passes the _encoded_ Input and Output values of a Process to the given
 * function.
 *
 * To achieve this, the Process' Task validators are used to encode values. Since encoded values may not be compatible
 * with those originally provided, they are *not* used to modify the original dispatch process. Therefore, this
 * function is most useful in combination with Instrumentation middleware.
 */
export const encoded = (middleware: MiddlewareFn): MiddlewareFn => (
  process,
  next
) => {
  // First, we call `next(process)` to obtain the Future representing the rest of the dispatch process.
  // To prevent any downstream middlewares from `.fork()`ing the same Future twice, we use `.cache()`.
  const dispatch = next(process).pipe(fluent).cache();

  // Concurrent to this, we feed the original input value back into the Process' input validator.
  const encodedProcess = process.spec
    .input(process.input)
    .pipe(fluent)
    // If the Input is invalid, this would reject; so coalesce the error and continue
    .chainRej<InputValidationError<any>>(resolve)
    // Finally, replace the `input` property with the encoded input or coalesced validation error
    .map((input) => ({
      ...process,
      input,
    }));

  // Feeds the output of the Task back into the Process' output validator
  const encodedOutput = dispatch.chain(process.spec.output);

  // A 'fake' continuation function that allows the wrapped middleware to receive the encoded output of this Process.
  const encodedNext = () => encodedOutput;

  /**
   * Calls the original middleware function with:
   * 1. The encoded Process object that will provided the encoded Input
   * 2. The fake continuation function that will provide the encoded Output
   */
  const encodedDispatch = encodedProcess.chain((process) =>
    middleware(process, encodedNext)
  );

  /**
   * Finally, we use `joinWith` to run the two dispatches together while preventing a rejection on either from cancelling
   * the other.
   */
  return dispatch.pipe(joinWith(encodedDispatch));
};
