/**
 * A specialized application of Middleware that can observe the progression and settlement of Task executions, intended
 * for a way of analyzing the run-time behaviour of mgFx-powered applications.
 */
import { bimap, Future, FutureInstance, race } from 'fluture';

import { Process, Spec } from '../task';
import { MiddlewareFn } from '../middleware';
import { tapCancellation } from '../utils';

/**
 * The type of Event messages that the base Instrumenter will emit
 */
export type BaseEvent = {
  timestamp: number;
};

export type ProcessEvent = BaseEvent & {
  kind: 'process';
  process: Omit<Process, 'spec'> & {
    spec: Pick<Spec, 'name'>;
  };
};

export type ResolutionEvent = BaseEvent & {
  kind: 'resolution';
  id: string;
  value: any;
};

export type RejectionEvent = BaseEvent & {
  kind: 'rejection';
  id: string;
  reason: any;
};

export type CancellationEvent = BaseEvent & {
  kind: 'cancellation';
  id: string;
};

export type HeartbeatEvent = BaseEvent & {
  kind: 'heartbeat';
  id: string;
};

export type Event =
  | ProcessEvent
  | ResolutionEvent
  | RejectionEvent
  | CancellationEvent
  | HeartbeatEvent;

export type Receiver = (event: Event) => void;

/**
 * The configuration options that should be passed to `makeInstrumenter` when making a specialized Instrumenter.
 * The `receiver` function will receive every Event that is seen by the Instrumenter.
 */
export type Config = {
  receiver: Receiver;
  heartbeat?: HeartbeatConfig;
};

/**
 * Configuration options that are specific to the 'heartbeat' functionality, which sends Events at the interval (in
 * milliseconds) specified by `interval`. Set to `0` to disable heartbeat functionality.
 */
export type HeartbeatConfig = {
  interval?: number;
}

const timestamp = () => Date.now();

const tap = <T>(fn: (value: T) => any) => (value: T) => {
  fn(value);
  return value;
};

const makeHeartbeatMonitor = (receiver: Receiver, config: HeartbeatConfig) => (
  process: Process
) =>
  race(
    Future(() => {
      const interval = setInterval(() => {
        receiver({
          kind: 'heartbeat',
          timestamp: timestamp(),
          id: process.id,
        });
      }, config.interval);

      return () => {
        clearInterval(interval);
      };
    })
  );

/**
 * Creates a Middleware function that:
 * - Emits `process` Events *before* a Process begins execution.
 * - Emits `rejection` or `resolutions` Events *after* a Process has completed (successfully or unsuccessfully).
 * - Emits `cancellation` Events whenever a Process was cancelled.
 * - Emits `heartbeat` Events at a configurable interval as long as the Process is running.
 */
export const makeInstrumenter = (
  config: Config
): MiddlewareFn<Process, FutureInstance<any, any>> => {
  const { heartbeat, receiver } = config;

  const heartbeatMonitor = heartbeat?.interval
    ? makeHeartbeatMonitor(receiver, heartbeat)
    : undefined;

  return (process, next) => {
    receiver({
      kind: 'process',
      timestamp: timestamp(),
      process,
    });

    const dispatch = next(process)
      .pipe(
        bimap(
          tap((reason) => {
            receiver({
              kind: 'rejection',
              timestamp: timestamp(),
              id: process.id,
              reason,
            });
          })
        )(
          tap((value) => {
            receiver({
              kind: 'resolution',
              timestamp: timestamp(),
              id: process.id,
              value,
            });
          })
        )
      )
      .pipe(
        tapCancellation(() => {
          receiver({
            kind: 'cancellation',
            timestamp: timestamp(),
            id: process.id,
          });
        })
      );

      return heartbeatMonitor
        ? dispatch.pipe(heartbeatMonitor(process))
        : dispatch;
  };
};
