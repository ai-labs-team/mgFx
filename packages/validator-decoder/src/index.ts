import { Validator, ValidationError } from 'mgfx/dist/validator';
import { Decoder } from '@ailabs/ts-utils/dist/decoder';
import * as t from '@ailabs/ts-utils/dist/decoder';
import { reject, resolve, FutureInstance } from 'fluture';

export const decoder = <T>(decode: Decoder<T, any>): Validator<T> => (value) =>
  decode(value).fold<FutureInstance<any, T>>(
    (error) => reject(new ValidationError(error)),
    resolve
  );

export { t };
