import * as t from 'io-ts';
import { reject, resolve } from 'fluture';
import { fold } from 'fp-ts/lib/Either';
import { failure } from 'io-ts/lib/PathReporter';

import { Validator, ValidationError } from 'mgfx/dist/validator';

export const ioTs = <T extends t.Type<any>>(
  ioType: T
): Validator<t.TypeOf<T>> => value =>
  fold(
    (errors: t.Errors) =>
      reject(new ValidationError(failure(errors).join('\n'))),
    resolve as any
  )(ioType.decode(value));

export { t };
