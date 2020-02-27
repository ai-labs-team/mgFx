/**
 * A specialized application of Middleware that can observe the progression and settlement of Task executions, intended
 * for a way of analyzing the run-time behaviour of mgFx-powered applications.
 */
import { map, bimap } from 'fluture';

import { Process } from '../task';
import { Bundle } from '../middleware';
import { tapCancellation } from '../utils';

/**
 * The type of Event messages that the base Instrumenter will emit
 */
export type Event = { timestamp: number } & (
  | { kind: 'process'; process: Process }
  | { kind: 'resolution'; id: string; value: any }
  | { kind: 'rejection'; id: string; reason: any }
  | { kind: 'cancellation'; id: string }
);

/**
 * The configuration options that should be passed to `makeInstrumenter` when making a specialized Instrumenter.
 * The `sink` function will receive every Event that is seen by the Instrumenter.
 */
export type Config = {
  receiver: (event: Event) => void;
};

const timestamp = () => Date.now();

const tap = <T>(fn: (value: T) => any) => (value: T) => {
  fn(value);
  return value;
};

/**
 * Creates a Middleware bundle that:
 * - Emits `process` Events *before* a Process begins execution.
 * - Emits `rejection` or `resolutions` Events *after* a Process has completed (successfully or unsuccessfully).
 * - Emits `cancellation` Events whenever a Process was cancelled.
 */
export const makeInstrumenter = (config: Config): Bundle => ({
  pre: map(
    tap(process => {
      config.receiver({
        kind: 'process',
        timestamp: timestamp(),
        process
      });
    })
  ),

  post: (future, process) =>
    future
      .pipe(
        bimap(
          tap(reason => {
            config.receiver({
              kind: 'rejection',
              timestamp: timestamp(),
              id: process.id,
              reason
            });
          })
        )(
          tap(value => {
            config.receiver({
              kind: 'resolution',
              timestamp: timestamp(),
              id: process.id,
              value
            });
          })
        )
      )
      .pipe(
        tapCancellation(() => {
          config.receiver({
            kind: 'cancellation',
            timestamp: timestamp(),
            id: process.id
          });
        })
      )
});
