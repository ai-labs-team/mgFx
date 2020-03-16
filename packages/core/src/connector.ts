/**
 * The heart of mgFx is the 'connector'. An instance of a Connector provides two functions that are fundamental in
 * executing Tasks:
 *
 * - `run` - Accepts a Process object (returned by calling a Task definition function) and attempts to run it.
 * - `host` - Registers an 'implementation' object for a Task that will be invoked whenever a matching Process object
 *    is received.
 *
 * The 'base' connector implementation is an abstraction; specific a specific concrete implementation must be used to
 * provide the transport between `exec` and `provide`.
 */
import { FutureInstance, attempt, chain, map, parallel } from 'fluture';

import {
  ContextOf,
  Process,
  InputOf,
  OutputOf,
  Spec,
  Implementation,
  ImplementationFunction
} from './task';
import { Context, Values, makeContext } from './context';
import { UseFn, makeContainer } from './middleware';
import { validateContext, validateInput, validateOutput } from './validator';
import { toFuture } from './utils';

/**
 * Like `ImplementationFunction`, except that it has been 'encased'; the function will always return a Future, even if
 * the function returned or threw synchronously.
 */
export type EncasedImplementationFunction<S extends Spec = Spec> = (
  input: InputOf<S>,
  environment: Environment<S>
) => FutureInstance<any, OutputOf<S>>;

/**
 * An 'environment' object is supplied as the second parameter to every Task implementation; it provides an 'escape
 * hatch' of sorts that allows Task implementations to:
 *
 * 1. Invoke other Tasks as 'children' via the `runChild` function.
 * 2. Access context values via the `context` object.
 */
export type Environment<S extends Spec = Spec> = {
  runChild: RunFn;
  context: ContextOf<S>;
};

/**
 * A Function that, when called, will initialize an Environment object that can be passed to a Task's implementation.
 * The base Connector implementation takes care of providing a common EnvironmentInitializer to different
 * implementations.
 */
export type EnvironmentInitializer<S extends Spec = Spec> = (
  process: Pick<Process, 'id' | 'context'>
) => Environment<S>;

/**
 * A 'run' function is used by various components; it accepts a Process object (created by calling a Task's Definition
 * function) and returns a Future that will resolve to the value returned by that Task's implementation.
 */
export type RunFn = <S extends Spec>(
  process: FutureInstance<any, Process<S>>
) => FutureInstance<any, OutputOf<S>>;

/**
 * The 'serve' function allows an Implementation object to be registered against a Connector, allowing it to execute
 * that Implementation whenever a matching Process is run via this Connector.
 *
 * It returns a function that terminates the service, preventing any subsequent executions of this implementation, and
 * cancelling any currently in-flight executions.
 */
export type ServeFn = <S extends Spec>(
  implementation: Implementation<S>
) => () => void;

/**
 * Describes a JavaScript module that exports nothing but Implementations. This is used in conjunction with
 * `connector.serveModule` to provide a convenient way to serve all Implementations contained within an Object, such as
 * a JavaScript module.
 */
export type ImplementationModule = {
  [key: string]: Implementation;
};

/**
 * The 'connector' object provides a common interface for mgFx regardless of the underlying transport mechanism being
 * used. Typically, end-users would not create a Connector explicitly; instead, they would use a ready-made Connector,
 * or call `makeConnector` to create an entirely custom implementation.
 */
export type Connector = {
  serve: ServeFn;
  serveModule: (module: ImplementationModule) => () => void;
  run: RunFn;
  use: UseFn;
  createContext: (values?: Values) => Context;
};

/**
 * Encapsulates the implementation-specific functions that must be passed into `makeConnector` in order to produce a
 * functional connector instance.
 *
 * The `dispatch` function must be capable of accepting a Process object, locating a matching Implementation,
 * invoking the Implementation Function with the Process' input, and returning a Future that represents that
 * Implementation's outcome.
 *
 * The `provide` function must be capable of accepting an Implementation object and EnvironmentInitializer function,
 * and registering them internally in such a way that the Implementation can be matched to Processes received via
 * `dispatch`.
 */
export type Config = {
  dispatch: (process: Process) => FutureInstance<any, any>;
  provide: (
    spec: Spec,
    implementation: EncasedImplementationFunction,
    environmentInitializer: EnvironmentInitializer
  ) => () => void;
};

/**
 * 'wraps' a Task implementation so that it always returns a Future; even if this Task implementation throws an error,
 * the error will be safely contained within a rejected Future.
 */
export const encaseImplementation = <S extends Spec>(
  implementation: ImplementationFunction<S>
): EncasedImplementationFunction<S> => (input, environment) =>
  attempt(() => implementation(input, environment)).pipe(chain(toFuture));

/**
 * Creates a Connector; typically end-users would not call this directly, and would instead rely on a specific
 * Connector implementation that calls this implicitly.
 */
export const makeConnector = (config: Config): Connector => {
  const middleware = makeContainer();

  const environmentInitializer: EnvironmentInitializer = parentProcess => ({
    runChild: process =>
      process
        .pipe(
          map(childProcess => ({
            ...childProcess,
            parentId: parentProcess.id,
            context: parentProcess.context
          }))
        )
        .pipe(self.run),

    context: parentProcess.context ? parentProcess.context.values : {}
  });

  const self: Connector = {
    use: middleware.use,

    run: process =>
      middleware.apply.pre(process).pipe(
        chain(process =>
          parallel(Infinity)([
            validateInput(process.spec.input, process.input),
            validateContext(process.spec.context, process.context)
          ])
            .pipe(chain(_ => config.dispatch(process)))
            .pipe(chain(output => validateOutput(process.spec.output, output)))
            .pipe(future => middleware.apply.post(future, process))
        )
      ),

    serve: ({ spec, implementation }) =>
      config.provide(
        spec,
        encaseImplementation(implementation) as any,
        environmentInitializer
      ),

    serveModule: module => {
      const cancelFns = Object.keys(module).map(name => {
        const implementation = module[name];
        return self.serve(implementation);
      });

      return () => {
        cancelFns.forEach(cancelFn => cancelFn());
      };
    },

    createContext: values => makeContext(self.run, undefined, values)
  };

  return self;
};
