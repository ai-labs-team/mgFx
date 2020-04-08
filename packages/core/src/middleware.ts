/**
 * A function that can be added via a Middleware Container's `use` function.
 * `previous` will be the value that passed from the previous Middleware function in the 'stack'.
 * `next` is a reference to the next Middleware function in the 'stack'.
 *
 * @example
 * // No-op
 * container.use((x, next) => next(x))
 *
 * @example
 * // Tap input/output
 * container.use((x, next) => {
 *   console.log('input', x);
 *   const result = next(x);
 *   console.log('output', result);
 *   return result
 * })
 *
 * @example
 * // Mutate input
 * container.use((x, next) => next({
 *   ...x,
 *   extraProp: true
 * }))
 *
 * @example
 * // Mutate output
 * container.use((x, next) => ({
 *   ...next(x),
 *   extraProp: true
 * }))
 *
 * @example
 * // Short-circuit/Branching
 * container.use((x, next) => x.authenticated ? next(x) : 'Access Denied')
 */
export type MiddlewareFn<T, U> = (previous: T, next: NextFn<T, U>) => U;

/**
 * A reference to the 'next' function in the Middleware stack.
 */
export type NextFn<T, U> = (value: T) => U;

/**
 * Used to 'add' another function to the Middleware stack.
 */
export type UseFn<T, U> = (middleware: MiddlewareFn<T, U>) => void;

/**
 * A Middleware container provides an encapsulation for Middleware functions to be 'registered' via `use`, and then
 * applied when required via `apply`.
 */
export type Container<T, U> = {
  use: UseFn<T, U>;
  apply: NextFn<T, U>;
};

/**
 * Creates a Middleware container. Requires an initial implementation function via `initial`. New Middleware functions
 * may be added via `use`, and the result of calling the entire stack via `apply`.
 */
export const makeContainer = <T, U>(initial: NextFn<T, U>): Container<T, U> => {
  let stack = initial;

  return {
    use: (middleware) => {
      const next = stack;
      stack = (value) => middleware(value, next);
    },

    apply: (value) => stack(value),
  };
};
