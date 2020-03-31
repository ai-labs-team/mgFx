import { CustomError } from 'ts-custom-error';
import {
  FutureInstance,
  chainRej,
  reject,
  parallel,
  map,
  resolve
} from 'fluture';

/**
 * The base class from which all Validator-error related classes inherit.
 */
export class ValidationError<T> extends CustomError {
  constructor(public readonly errors: T) {
    super();
  }
}

/**
 * The specialized error class used to emit validation failures on Task inputs.
 */
export class InputValidationError<T> extends ValidationError<T> {}

/**
 * The specialized error class used to emit validation failures on Task outputs.
 */
export class OutputValidationError<T> extends ValidationError<T> {}

/**
 * The specialized error class used to emit validation failures on Context values.
 */
export class ContextValidationError<T, K> extends ValidationError<T> {
  constructor(public readonly contextKey: K, errors: T) {
    super(errors);
  }
}

/**
 * A Validator function accepts an arbitrary value of `<T>`, and returns a Future that either rejects with an Error
 * that extends the `CustomError` class, or resolves with the originally supplied `value`.
 *
 * *IMPORTANT*: When implementing a custom Validator function, ensure that it declares a single type parameter that
 * defines the design-time type of the value that should pass validation to insure correct type inference at
 * design-time.
 */
export type Validator<T> = (
  value: T
) => FutureInstance<ValidationError<any>, T>;

/**
 * Allows Context values to be validated as individual key/value pairs, and valid context key names to be inferred and
 * correlated to their respective validator function.
 */
export type ContextValidators<T> = {
  [K in keyof T]: Validator<T[K]>;
};

/**
 * A Conditional type that allows type information to be inferred from a Validator function at design-time.
 */
export type TypeOf<T> = T extends Validator<infer U> ? U : never;

/**
 * Specialized application of a Validator function and value, that coerces validation failure errors to
 * `InputValidationError`.
 */
export const validateInput = <T>(validator: Validator<T>, value: T) =>
  validator(value).pipe(
    chainRej(reason => reject(new InputValidationError(reason.errors)))
  );

/**
 * Specialized application of a Validator function and value, that coerces validation failure errors to
 * `OutputValidationError`.
 */
export const validateOutput = <T>(validator: Validator<T>, value: T) =>
  validator(value).pipe(
    chainRej(reason => reject(new OutputValidationError(reason.errors)))
  );

/**
 * Specialized application of multiple Validator functions and values contained within an object.
 *
 * Each value within the `context` object is validated against it's corresponding validation function within the
 * `validators` object in parallel.
 *
 * Returns a Future that will reject with the first key/value pair that failed validation, or resolve to an object
 * containing the context key/value pairs.
 */
export const validateContext = <T>(
  validators: ContextValidators<T> | undefined,
  context: { values: T } = { values: {} as any }
) => {
  if (!validators) {
    return resolve(context.values);
  }

  const validatorKeys = Object.keys(validators);

  const validations = validatorKeys.map(key => {
    const validator = validators[key as keyof T];
    const value = context.values[key as keyof T];

    return validator(value).pipe(
      chainRej(reason => reject(new ContextValidationError(key, reason.errors)))
    );
  });

  return parallel(validatorKeys.length)(validations).pipe(map(_ => context));
};
