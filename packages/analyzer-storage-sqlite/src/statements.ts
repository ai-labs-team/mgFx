import { value, error } from '@mgfx/codecs';
import { attemptP, chain, encaseP, map, parallel } from 'fluture';
import {
  ProcessEvent,
  RejectionEvent,
  ResolutionEvent,
  CancellationEvent
} from 'mgfx/dist/middleware/instrumenter';
import { Database, Statement } from 'sqlite';

/**
 * Inserts a row into the `events_process` table; used to store Events where `event.kind === 'process'`
 */
const putEventProcess = `
INSERT INTO events_process (
  timestamp,
  process_spec_name,
  process_id,
  process_parent_id,
  input,
  context_id,
  context_parent_id,
  context_values
) VALUES (
  $timestamp,
  $processSpecName,
  $processId,
  $processParentId,
  $input,
  $contextId,
  $contextParentId,
  $contextValues
)
`;

/**
 * Inserts a row into the `events_resolution` table; used to store Events where `event.kind === 'resolution'`
 */
const putEventResolution = `
INSERT INTO events_resolution (
  timestamp,
  id,
  value
) VALUES (
  $timestamp,
  $id,
  $value
)
`;

/**
 * Inserts a row into the `events_rejection` table; used to store Events where `event.kind === 'rejection'`
 */
const putEventRejection = `
INSERT INTO events_rejection (
  timestamp,
  id,
  reason
) VALUES (
  $timestamp,
  $id,
  $reason
)
`;

/**
 * Inserts a row into the `events_cancellation` table; used to store Events where `event.kind === 'cancellation'`
 */
const putEventCancellation = `
INSERT INTO events_cancellation (
  timestamp,
  id
) VALUES (
  $timestamp,
  $id
)
`;

/**
 * Updates a row in the `spans` table based upon the result of the `computed_spans` view for a specific process ID
 */
const updateSpan = `
REPLACE INTO spans
  SELECT *
  FROM computed_spans
  WHERE id = $id
`;

const all = parallel(Infinity);

const prepareStatement = (db: Database, statement: string) =>
  attemptP(() => db.prepare(statement));

const prepareStatements = (db: Database) =>
  parallel(Infinity)([
    prepareStatement(db, putEventProcess),
    prepareStatement(db, putEventResolution),
    prepareStatement(db, putEventRejection),
    prepareStatement(db, putEventCancellation),
    prepareStatement(db, updateSpan)
  ]).pipe(
    map(
      ([
        putEventProcess,
        putEventResolution,
        putEventRejection,
        putEventCancellation,
        updateSpan
      ]) => ({
        putEventProcess,
        putEventResolution,
        putEventRejection,
        putEventCancellation,
        updateSpan
      })
    )
  );

const run = (statement: Statement) =>
  encaseP((values: any) => statement.run(values));

export const bind = (db: Database) =>
  prepareStatements(db).pipe(
    map(statements => {
      const updateSpan = (id: string) => () =>
        run(statements.updateSpan)({ $id: id });

      const putEventProcess = (event: ProcessEvent) =>
        all([
          value.encode(event.process.input),
          value.encode(event.process.context?.values ?? undefined)
        ])
          .pipe(
            map(([$input, $contextValues]) => ({
              $input,
              $contextValues,
              $timestamp: event.timestamp,
              $processSpecName: event.process.spec.name,
              $processId: event.process.id,
              $processParentId: event.process.parentId,
              $contextId: event.process.context?.id ?? undefined,
              $contextParentId: event.process.context?.parentId ?? undefined
            }))
          )
          .pipe(chain(run(statements.putEventProcess)))
          .pipe(chain(updateSpan(event.process.id)));

      const putEventRejection = (event: RejectionEvent) =>
        error
          .encode(event.reason)
          .pipe(
            map($reason => ({
              $id: event.id,
              $timestamp: event.timestamp,
              $reason
            }))
          )
          .pipe(chain(run(statements.putEventRejection)))
          .pipe(chain(updateSpan(event.id)));

      const putEventResolution = (event: ResolutionEvent) =>
        value
          .encode(event.value)
          .pipe(
            map($value => ({
              $id: event.id,
              $timestamp: event.timestamp,
              $value
            }))
          )
          .pipe(chain(run(statements.putEventResolution)))
          .pipe(chain(updateSpan(event.id)));

      const putEventCancellation = (event: CancellationEvent) =>
        run(statements.putEventCancellation)({
          $id: event.id,
          $timestamp: event.timestamp
        }).pipe(chain(updateSpan(event.id)));

      return {
        putEventProcess,
        putEventRejection,
        putEventResolution,
        putEventCancellation
      };
    })
  );
