import Redis, { RedisOptions } from 'ioredis';
import { chain, fork, chainRej, race, map } from 'fluture';
import {
  makeConnector,
  EncasedImplementationFunction,
  EnvironmentInitializer
} from 'mgfx/dist/connector';
import { hostname } from 'os';
import { Process, Spec } from 'mgfx/dist/task';
import { tapCancellation } from 'mgfx/dist/utils';

import { Codecs, defaultCodecs, SerializedProcess } from './codecs';
import { makeConnectionPool, poolHook } from './connection-pool';
import * as protocol from './protocol';

/**
 * The configuration options supported by the Redis connector.
 *
 * - `redis` - IORedis configuration options
 * - `resultPollTimeoutSeconds` - The number of seconds to poll a Redis list for the result of a running Process.
 *    Defaults to 5 seconds.
 * - `providerPollTimeoutMs` - The number of milliseconds to poll a Redis stream for new Processes to run.
 *    Defaults to 1000 ms.
 * - `providerBatchSize` - The 'batch size' to use when polling a Redis stream for new Processes to run.
 *    Defaults to 10.
 * - `maxBlockingConnections` - The maximum number of blocking Redis connections that this Connector may create.
 *    Defaults to 1000.
 *  - `consumerGroupName` - The name of the Consumer Group that this Connector will use when polling a Redis stream for
 *    new Process to run.
 *    Defaults to `mgfx:consumers`
 * - `consumerId` - The unique name of the Consumer that this Connector will use when polling a Redis stream for new
 *    Processes to run.
 *    Defaults to `{process.pid}@{hostname}`
 * - `codecs` - Allows customisation of the encoding and decoding of Process objects, I/O values and errors when
 *    persisted to, or retrieved from Redis.
 *    See the `./codecs` module for the default codec implementations and further information.
 */
export type Options = {
  redis?: RedisOptions;
  resultPollTimeoutSeconds?: number;
  providerPollTimeoutMs?: number;
  providerBatchSize?: number;
  maxBlockingConnections?: number;
  consumerGroupName: string;
  consumerId?: string;
  codecs?: Codecs;
};

/**
 * Creates an mgFx Connector that uses Redis for distributed functionality.
 */
export const redis = (options: Partial<Options> = {}) => {
  const {
    resultPollTimeoutSeconds = 5,
    providerPollTimeoutMs = 1000,
    providerBatchSize = 10,
    maxBlockingConnections = 1000,
    consumerGroupName = 'mgfx:consumers',
    consumerId = `${process.pid}@${hostname}`,
    codecs = defaultCodecs
  } = options;

  // The 'primary' connection; used to send non-blocking commands
  const r = new Redis(options.redis);

  // Create a Pool to manage additional connections used for blocking commands
  const pool = makeConnectionPool(r, maxBlockingConnections);
  const withConnection = poolHook(pool);

  // Use `protocol.waitForResult` with a blockable connection granted from the pool
  const waitForResultBlocking = (process: Process) =>
    withConnection(
      protocol.waitForResult(codecs, resultPollTimeoutSeconds, process)
    );

  // Call `protocol.notifyCancellation` whenever a Process is cancelled
  const notifyCancellation = (process: Process) =>
    tapCancellation(protocol.cancellationNotifier(r, process));

  // Use `protocol.waitForProcess` with a blockable connection granted from the pool to receive serialized Processes,
  // decode them, and then invoke a Task implementation.
  const waitForProcessBlocking = (
    spec: Spec,
    implementation: EncasedImplementationFunction,
    environmentInitializer: EnvironmentInitializer
  ) => {
    const receiver = (serializedProcess: string) =>
      codecs.process
        .decode(serializedProcess)
        .pipe(
          chain(process =>
            implementation(process.input, environmentInitializer(process))
              .pipe(chain(protocol.resolutionNotifier(r, codecs, process)))
              .pipe(chainRej(protocol.rejectionNotifier(r, codecs, process)))
              .pipe(race(waitForCancellationBlocking(process)))
          )
        )
        .pipe(runSilently);

    return withConnection(
      protocol.waitForProcess(
        consumerGroupName,
        consumerId,
        providerPollTimeoutMs,
        providerBatchSize,
        spec,
        receiver
      )
    );
  };

  // Use `protocol.waitForCancellation` with a blockable connection granted from the pool
  const waitForCancellationBlocking = (process: SerializedProcess) =>
    withConnection(
      protocol.waitForCancellation(process, resultPollTimeoutSeconds)
    );

  // A specialized version of `fluture.fork` that swallows rejection/resolution values
  const runSilently = fork(() => {})(() => {});

  // Maintain a list of provider cancellation functions
  // TODO: This can probably be refactored into the base Connector implementation
  const cancelProviders: Array<() => void> = [];
  const cancelAllProviders = () => {
    cancelProviders.forEach(cancelProvider => {
      cancelProvider();
    });
  };

  return {
    ...makeConnector({
      dispatch: process =>
        protocol
          .sendProcess(r, codecs, process)
          .pipe(chain(() => waitForResultBlocking(process)))
          .pipe(notifyCancellation(process)),

      provide: (spec, implementation, environmentInitializer) => {
        const cancelProvider = protocol
          .initializeConsumerGroup(r, spec, consumerGroupName)
          .pipe(
            chain(() =>
              waitForProcessBlocking(
                spec,
                implementation,
                environmentInitializer
              )
            )
          )
          .pipe(runSilently);

        cancelProviders.push(cancelProvider);
        return cancelProvider;
      }
    }),

    /**
     * Effectively 'shuts down' this Connector by disconnecting the primary Redis connection, draining the blocking
     * connection pool, and cancelling all registered providers.
     */
    shutdown: () => {
      pool.drain();
      r.disconnect();
      // TODO: The concept of 'shutting down' a connector can likely be refactored into the core Connector
      // implementation.
      cancelAllProviders();
    }
  };
};
