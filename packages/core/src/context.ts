/**
 * Contexts provide some ergonmics for developers working with mgFx, specifically:
 *
 * 1. They allow some logical grouping of Task executions based upon where the execution originated. For example, we
 * could isolate our analysis to all Tasks that were executed as a result of a specific user's actions.
 * 2. They allow arbitrary values to be declared a high level in our application, and then accessed by a Task very
 * deeply nested in an execution pipeline, without the need to explicitly pass inputs and outputs between intermediate
 * Tasks.
 */
import { map } from 'fluture';
import { uuid } from 'uuidv4';

import { RunFn } from './connector';

/**
 * The allowed types that may be specified with Context values. Since Context values are included in *every* Process
 * (regardless of whether the Task being processed uses Context or not), we guard against deep or complex Context
 * structures by restricting the allowed value types to strings, numbers, booleans (and arrays of.)
 */
export type Value = string | number | boolean | string[] | number[] | boolean[];

/**
 * An object containing key/value pairs with a Context.
 */
export type Values = { [key: string]: Value };

/**
 * A Context object is a simple container that encapsulates:
 *
 * - A unique identifier; mgFx does not care about the ID, but is provided to aid in analysis when using
 * instrumentation and/or other middleware.
 * - A reference to a 'parent' context, if any. Like `id`, this property is not used by mgFx but is useful for
 * analysis.
 * - A reference to a Connector's `run` function.
 * - The ability to create a 'child' Context that inherits from this one.
 */
export type Context = {
  id: string;
  parentId?: string;
  run: RunFn;
  createChild: (values?: Values) => Context;
};

/**
 * Creates a Context object; typically, end-users do not need to call this function directly, as the base Connector
 * provides a specialized interface for creating Contexts using this function via `createContext`.
 */
export const makeContext = (
  run: RunFn,
  parent?: Context,
  values: Values = {}
) => {
  const id = uuid();
  const parentId = parent ? parent.id : undefined;

  const self: Context = {
    id,
    parentId,

    run: process =>
      process
        .pipe(
          map(process => ({
            ...process,
            context: {
              id,
              parentId,
              values
            }
          }))
        )
        .pipe(run),

    createChild: childValues =>
      makeContext(run, self, {
        ...values,
        ...childValues
      })
  };

  return self;
};
