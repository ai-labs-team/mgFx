import { FutureInstance, resolve } from 'fluture';
import { uuid } from 'uuidv4';

import { Environment } from './connector';
import { Values } from './context';
import { Validator, TypeOf } from './validator';

/**
 * A Spec object describes the unique name of a Task, as well as validation functions to be used for run-time checking
 * of Input, Output, and optionally, Context values.
 */
export type Spec = {
  name: string;
  input: Validator<any>;
  output: Validator<any>;
  context?: {
    [key: string]: Validator<any>;
  };
};

/**
 * A Conditional type that allows us to extract the design-time type information of a Spec object's `input` type, based
 * on it's validator function.
 */
export type InputOf<S extends Spec> = S extends Spec
  ? TypeOf<S['input']>
  : never;

/**
 * A Conditional type that allows us to extract the design-time type information of a Spec object's `output` type,
 * based on it's validator function.
 */
export type OutputOf<S extends Spec> = S extends Spec
  ? TypeOf<S['output']>
  : never;

/**
 * A Conditional type that allows the keys defined in a Task spec's `context` object to be extracted.
 */
export type ContextKeysOf<S> = S extends Spec ? keyof S['context'] : never;

/**
 * A Conditional type that allows the design-time type information of values in a Spec's `context` object to be
 * extracted.
 */
export type ContextOf<S> = S extends Spec
  ? { [K in ContextKeysOf<S>]: TypeOf<S['context'][K]> }
  : never;

/**
 * A Definition allows a Task to be invoked by end-users through a simple function-call. The function expects a single
 * parameter, whose design-time type will be determined by the Validator function supplied for `spec.input`.
 *
 * When called, the Definition function will return a Future that resolves to a Process object.
 *
 * It is important to note that a Definition does *not* encapsulate the information required to actually _perform_ a
 * Task's computation. This role is performed by an `Implementation` object.
 */
export type Definition<S extends Spec = Spec> = {
  spec: S;
  (input: InputOf<S>): FutureInstance<never, Process<S>>;
};

/**
 * An Implementation object extends a Definition object, and includes a Function that is responsible for performing
 * some Tasks's computation proper.
 */
export type Implementation<S extends Spec = Spec> = Definition<S> & {
  implementation: ImplementationFunction<S>;
};

/**
 * The signature of a Task's implementation. It accepts two arguments:
 *
 * - `input` is the input that was passed in when calling the Task
 * - `environment` contains functions and values that may be of use during the Task's execution, such as accessing
 *    Context or running additional Tasks as children.
 */
export type ImplementationFunction<S extends Spec = Spec> = (
  input: InputOf<S>,
  environment: Environment<S>
) => OutputOf<S> | FutureInstance<any, OutputOf<S>>;

/**
 * A Process object encapsulates the information necessary to run a Task. A Process object is obtained by invoking a
 * Definition function, and is typically passed to a `run` function (such as that exposed on a Connector, Context or
 * Environment.)
 */
export type Process<S extends Spec = Spec> = {
  spec: S;
  id: string;
  parentId?: string;
  input: InputOf<S>;
  context?: {
    id: string;
    parentId?: string;
    values: Values;
  };
};

export type DefineFn = <S extends Spec>(spec: S) => Definition<S>;

export type ImplementFn = <S extends Spec>(
  definition: Definition<S>,
  implementation: ImplementationFunction<S>
) => Implementation<S>;

/**
 * Creates a Definition function from a Spec object.
 */
export const define: DefineFn = <S extends Spec>(spec: S): Definition<S> => {
  const proxy = (input: InputOf<S>) =>
    resolve({
      spec,
      input,
      id: uuid()
    });

  return Object.assign(proxy, { spec });
};

/**
 * Creates an Implementation object from a Definition object.
 *
 * **NOTE**: To prevent mutation of the passed in `definition` object, a new definition is created by calling `define`
 * internally.
 */
export const implement: ImplementFn = <S extends Spec>(
  definition: Definition<S>,
  implementation: ImplementationFunction<S>
) => {
  const proxy = define(definition.spec);
  return Object.assign(proxy, { implementation });
};
