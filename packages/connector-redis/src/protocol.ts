/**
 * Contains the functions that allow the Redis connector to perform communication via a Redis server
 */
import {
  encaseP,
  chain,
  attemptP,
  go,
  reject,
  resolve,
  chainRej
} from 'fluture';
import { Redis } from 'ioredis';
import { Process, Spec } from 'mgfx/dist/task';
import { Codecs, SerializedProcess } from './codecs';

export type StreamResult = [
  string, // stream name
  [
    string, // item id
    string[] // item body
  ][] // items
][]; // streams;

/**
 * Uses a Redis connection to send an encoded representation of a Process object to a Stream
 */
export const sendProcess = (r: Redis, codecs: Codecs, process: Process) =>
  codecs.process
    .encode(process)
    .pipe(
      chain(
        encaseP(encoded => r.xadd(process.spec.name, '*', 'process', encoded))
      )
    );

/**
 * Uses a Redis connection to 'wait' for the result of a running Process by using the `BLPOP` command.
 * Returns a Future that will settle with the decoded resolution value or rejection reason.
 * CAUTION: This will block the Redis connection it is applied against.
 */
export const waitForResult = (
  codecs: Codecs,
  pollTimeout: number,
  process: Process
) => (r: Redis) => {
  const pollForResult = attemptP(() =>
    r.blpop(
      `${process.id}/resolved`,
      `${process.id}/rejected`,
      pollTimeout.toString()
    )
  );

  return go(function*() {
    while (true) {
      const result: [string, string] | null = yield pollForResult;

      if (result === null) {
        continue;
      }

      const [key, valueOrReason] = result;

      if (key.endsWith('/resolved')) {
        return yield codecs.io.decode(valueOrReason);
      }

      yield codecs.error.decode(valueOrReason).pipe(chain(reject));
    }
  });
};

/**
 * Initializes a Redis consumer group using a given connection using the `MKSTREAM` command. If an error is raised
 * because the group already exists, we assume that this error can be ignored.
 * Returns a Future that will resolve once the Consumer Group has been created (or confirmed to already exist.)
 */
export const initializeConsumerGroup = (
  r: Redis,
  spec: Spec,
  consumerGroupName: string
) =>
  attemptP<Error, 'OK'>(() =>
    r.xgroup('CREATE', spec.name, consumerGroupName, '$', 'MKSTREAM')
  ).pipe(
    chainRej(reason => {
      if (reason.message === 'BUSYGROUP Consumer Group name already exists') {
        return resolve('OK');
      }

      return reject(reason);
    })
  );

/**
 * Uses a Redis connection to continuously read from a Redis stream using `XREADGROUP`, looking for messages that
 * contain a Process for a Task that we have an Implementation for.
 *
 * When such a message is received, we invoke the Task implementation using the Process' input data.
 *
 * CAUTION: This will block the Redis connection it is applied against.
 */
export const waitForProcess = (
  consumerGroupName: string,
  consumerId: string,
  pollTimeout: number,
  batchSize: number,
  spec: Spec,
  receiver: (serializedProcess: string) => void
) => (r: Redis) => {
  const pollForProcess = encaseP((startId: string) =>
    r.xreadgroup(
      'GROUP',
      consumerGroupName,
      consumerId,
      'BLOCK',
      pollTimeout,
      'COUNT',
      batchSize,
      'STREAMS',
      spec.name,
      startId
    )
  );

  return go(function*() {
    let backlog = true;
    let lastId = '0-0';

    while (true) {
      const result: StreamResult | null = yield pollForProcess(
        backlog ? lastId : '>'
      );

      if (result === null) {
        // No results to process; start the loop again
        continue;
      }

      const items = result[0][1];
      if (items.length === 0) {
        // The result set was an empty list; this indicates that we have finished processing any backlog of messages;
        // clear the 'backlog' flag and start the loop again
        backlog = false;
        continue;
      }

      // Iterate each item in the result set and dispatch accordingly
      items.forEach(([id, body]) => {
        if (!body[1]) {
          // The item had no body; should happen under normal usage but guards against non-mgFx things that may have
          // written to the stream we're watching
          return;
        }

        // Acknowledge the received message and pass the serialized Process to the Receiver
        r.xack(spec.name, consumerGroupName, id);
        receiver(body[1]);
        lastId = id;
      });
    }
  });
};

/**
 * Uses a Redis connection to 'wait' for a Process' cancellation signal using `BLPOP`.
 * CAUTION: This will block the Redis connection it is applied against.
 */
export const waitForCancellation = (
  process: SerializedProcess,
  timeout: number
) => (r: Redis) => {
  const pollForCancellation = attemptP(() =>
    r.blpop(`${process.id}/cancelled`, timeout.toString())
  );

  return go<unknown, any>(function*() {
    while (true) {
      const result: string | null = yield pollForCancellation;
      if (result) {
        // A cancellation signal was received; break out of the loop
        return;
      }
    }
  });
};

/**
 * Uses a Redis connection to encode the resolution value of a completed Task and persist it using `LPUSH`.
 */
export const resolutionNotifier = (
  r: Redis,
  codecs: Codecs,
  process: SerializedProcess
) => (value: any) =>
  codecs.io
    .encode(value)
    .pipe(
      chain(
        encaseP(encodedValue => r.lpush(`${process.id}/resolved`, encodedValue))
      )
    );

/**
 * Uses a Redis connection to encode the rejection reason of a failed Task and persist it using `LPUSH`.
 */
export const rejectionNotifier = (
  r: Redis,
  codecs: Codecs,
  process: SerializedProcess
) => (reason: any) =>
  codecs.error
    .encode(reason)
    .pipe(
      chain(
        encaseP(encodedReason =>
          r.lpush(`${process.id}/rejected`, encodedReason)
        )
      )
    );

/**
 * Uses a Redis connection to signal that a Process was cancelled using `LPUSH`.
 */
export const cancellationNotifier = (r: Redis, process: Process) => () => {
  r.lpush(`${process.id}/cancelled`, 'true');
};
