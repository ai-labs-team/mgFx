import * as t from 'io-ts';
import { reject, resolve, FutureInstance } from 'fluture';
import { fold } from 'fp-ts/lib/Either';

import { Validator, ValidationError } from 'mgfx/dist/validator';

export type Report = {
  path: string[];
  expected: any;
  actual: unknown;
}[];

const report = (errors: t.Errors) =>
  errors.map(error => ({
    path: error.context.map(context => context.key).filter(Boolean),
    expected: error.context[error.context.length - 1].type.name,
    actual: error.value
  }));

export const ioTs = <T extends t.Type<any>>(
  ioType: T
): Validator<t.TypeOf<T>> => value =>
  fold<t.Errors, T, FutureInstance<ValidationError<Report>, T>>(
    errors => reject(new ValidationError(report(errors))),
    resolve
  )(ioType.decode(value));

export { t };
