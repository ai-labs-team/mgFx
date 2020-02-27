/**
 * 'middleware' allows users to observe and influnce mgFx's runtime behaviour.
 */
import { FutureInstance } from 'fluture';

import { Process } from './task';

/**
 * 'Pre' middleware functions are applied to Process objects, and can be used to observe (and modify, if required) them
 * before they are passed to a Connector's `run` function.
 */
export type PreFn = (
  process: FutureInstance<any, Process>
) => FutureInstance<any, Process>;

/**
 * 'Post' middleware functions are applied at the end of a Task's execution, and can be used to observe (and modify, if
 * required) the final outcome of a Task's execution, before that information is sent back to the original caller.
 */
export type PostFn = (
  future: FutureInstance<any, any>,
  process: Process
) => FutureInstance<any, any>;

/**
 * A 'bundle' object encapsulates one or many 'pre' and 'post' functions, to be consumed by the `use` function.
 */
export type Bundle = Partial<{
  pre: PreFn | PreFn[];
  post: PostFn | PostFn[];
}>;

export type UseFn = (bundle: Bundle) => void;

/**
 * A Middleware container provides an encapsulation for Middleware functions to be 'registered' via `use`, and then
 * applied when required via `apply.*`.
 */
export type Container = {
  use: UseFn;
  apply: {
    pre: PreFn;
    post: PostFn;
  };
};

/**
 * Creates a Middleware Container; this is typically called internally by a Connector when it is being made.
 */
export const makeContainer = (): Container => {
  const registered = {
    pre: [] as PreFn[],
    post: [] as PostFn[]
  };

  return {
    use: bundle => {
      if (bundle.pre) {
        registered.pre = registered.pre.concat(bundle.pre);
      }

      if (bundle.post) {
        registered.post = registered.post.concat(bundle.post);
      }
    },

    apply: {
      pre: process =>
        registered.pre.reduce((result, next) => next(result), process),

      post: (future, process) =>
        registered.post.reduce((result, next) => next(result, process), future)
    }
  };
};
