import { FutureInstance, encase, map } from 'fluture';
import { serializeError, deserializeError } from 'serialize-error';
import { Process } from 'mgfx/dist/task';

/**
 * An Encoder function accepts an arbitrary value and returns a Future that will resolve to the stringified
 * representation of that value.
 */
export type Encoder<T> = (value: T) => FutureInstance<any, string>;

/**
 * A Decoder function accepts a stringified representation of a value and returns a Future that will resolve to a
 * reified JavaScript value.
 */
export type Decoder<T> = (encoded: string) => FutureInstance<any, T>;

/**
 * A Codec encapsulates an Encoder and Decoder function, allowing bi-directional (de)serialization of JavaScript values
 * to strings.
 */
export type Codec<T> = {
  encode: Encoder<T>;
  decode: Decoder<T>;
};

/**
 * A 'lossy' Codec encapsulates an Encoder and Decoder function (like `Codec`), except that the 'decoded' value may not
 * be the same as the originally 'encoded' value, for values that may not be fully serializable.
 */
export type LossyCodec<T, U> = {
  encode: Encoder<T>;
  decode: Decoder<U>;
};

/**
 * A generic codec for handling values that are potentially `undefined`. The value is wrapped in an object with a `v`
 * property, to support correct (de)serialization of values that are `undefined`.
 */
export const value: Codec<any> = {
  encode: encase(v => (v === undefined ? '_undefined' : JSON.stringify({ v }))),
  decode: encase(str => (str === '_undefined' ? undefined : JSON.parse(str).v))
};

/**
 * A generic codec for handling error-like values
 */
export const error: Codec<any> = {
  encode: err => value.encode(serializeError(err)),
  decode: str => value.decode(str).pipe(map(deserializeError))
};
