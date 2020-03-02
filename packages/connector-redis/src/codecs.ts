/**
 * Type aliases and default functions for handling the (de)serialization of data stored in Redis
 */
import { serializeError, deserializeError } from 'serialize-error';
import { Process } from 'mgfx/dist/task';

import { Codec, LossyCodec, value, error } from '@mgfx/codecs';

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
 * The default Codec implementations that are used by the Redis connector unless specified otherwise.
 */
export const defaultCodecs: Codecs = {
  process: {
    encode: process =>
      value.encode({
        id: process.id,
        parentId: process.parentId,
        input: process.input
      }),

    decode: value.decode
  },

  io: value,
  error
};
