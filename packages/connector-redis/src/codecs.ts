/**
 * Type aliases and default functions for handling the (de)serialization of data stored in Redis
 */
import { FutureInstance, encase, map } from 'fluture';
import { serializeError, deserializeError } from 'serialize-error';
import { Process } from 'mgfx/dist/task';

/**
 * An Encoder function accepts an arbitrary value and returns a Future that will resolve to the stringified
 * representation of that value, suitable for persisting to Redis.
 */
export type Encoder<T> = (value: T) => FutureInstance<any, string>;

/**
 * A Decoder function accepts a string that was retrieved from Redis and returns a Future that will resolve to a
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
 * To reduce footprint, we only need to store the `id`, `parentId` and `input` properties of a Process into Redis.
 */
export type SerializedProcess = Pick<Process, 'id' | 'parentId' | 'input'>;

/**
 * The Codec types that the Redis connector requires for normal operation.
 */
export type Codecs = {
  process: LossyCodec<Process, SerializedProcess>;
  io: Codec<any>;
  error: Codec<any>;
};

/**
 * A generic decoder for parsing arbitrary JSON that was stored in Redis.
 */
export const parse: Decoder<any> = encase(value =>
  value === '' ? undefined : JSON.parse(value)
);

/**
 * A generic encoder for stringifying an abitrary JavaScript value as a JSON string.
 */
export const stringify: Encoder<any> = encase(value => JSON.stringify(value));

/**
 * The default Codec implementations that are used by the Redis connector unless specified otherwise.
 */
export const defaultCodecs: Codecs = {
  process: {
    encode: process =>
      stringify({
        id: process.id,
        parentId: process.parentId,
        input: process.input
      }),

    decode: parse
  },

  io: {
    encode: stringify,
    decode: parse
  },

  error: {
    encode: err => stringify(serializeError(err)),
    decode: str => parse(str).pipe(map(deserializeError))
  }
};
