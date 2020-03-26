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
 * Inserts a value into the value cache if it doesn't already exist
 */
const cacheValue = `
INSERT OR IGNORE INTO value_cache VALUES ($value);
`;

/**
 * Determines the Row ID of a pre-existing value in the value cache
 */
const cacheId = `
SELECT rowid FROM value_cache WHERE content = $value;
`;

/**
 * Inserts a row into the `events_process` table; used to store Events where `event.kind === 'process'`
 */
const putEventProcess = `
INSERT INTO events_process (
  timestamp,
  process_spec_name,
  process_id,
  process_parent_id,
  input_id,
  context_id,
  context_parent_id,
  context_values_id
) VALUES (
  $timestamp,
  $processSpecName,
  $processId,
  $processParentId,
  $inputId,
  $contextId,
  $contextParentId,
  $contextValuesId
)
`;

/**
 * Inserts a row into the `events_resolution` table; used to store Events where `event.kind === 'resolution'`
 */
const putEventResolution = `
INSERT INTO events_resolution (
  timestamp,
  id,
  value_id
) VALUES (
  $timestamp,
  $id,
  $valueId
)
`;

/**
 * Inserts a row into the `events_rejection` table; used to store Events where `event.kind === 'rejection'`
 */
const putEventRejection = `
INSERT INTO events_rejection (
  timestamp,
  id,
  reason_id
) VALUES (
  $timestamp,
  $id,
  $reasonId
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

const seq = parallel(1);

const prepareStatement = (db: Database, statement: string) =>
  attemptP(() => db.prepare(statement));

const prepareStatements = (db: Database) =>
  parallel(Infinity)([
    prepareStatement(db, cacheValue),
    prepareStatement(db, cacheId),
    prepareStatement(db, putEventProcess),
    prepareStatement(db, putEventResolution),
    prepareStatement(db, putEventRejection),
    prepareStatement(db, putEventCancellation),
    prepareStatement(db, updateSpan)
  ]).pipe(
    map(
      ([
        cacheValue,
        cacheId,
        putEventProcess,
        putEventResolution,
        putEventRejection,
        putEventCancellation,
        updateSpan
      ]) => ({
        cacheValue,
        cacheId,
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

const get = (statement: Statement) =>
  encaseP((values: any) => statement.get(values));

export const bind = (db: Database) =>
  prepareStatements(db).pipe(
    map(statements => {
      const updateSpan = (id: string) => () =>
        run(statements.updateSpan)({ $id: id });

      const cache = ($value: any) =>
        run(statements.cacheValue)({ $value })
          .pipe(chain(() => get(statements.cacheId)({ $value })))
          .pipe(map(row => row.rowid));

      const putEventProcess = (event: ProcessEvent) =>
        seq([
          value.encode(event.process.input).pipe(chain(cache)),
          value
            .encode(event.process.context?.values ?? undefined)
            .pipe(chain(cache))
        ])
          .pipe(
            map(([$inputId, $contextValuesId]) => ({
              $inputId,
              $contextValuesId,
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
          .pipe(chain(cache))
          .pipe(
            map($reasonId => ({
              $id: event.id,
              $timestamp: event.timestamp,
              $reasonId
            }))
          )
          .pipe(chain(run(statements.putEventRejection)))
          .pipe(chain(updateSpan(event.id)));

      const putEventResolution = (event: ResolutionEvent) =>
        value
          .encode(event.value)
          .pipe(chain(cache))
          .pipe(
            map($valueId => ({
              $id: event.id,
              $timestamp: event.timestamp,
              $valueId
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
