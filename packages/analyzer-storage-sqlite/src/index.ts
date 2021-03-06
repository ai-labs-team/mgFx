import {
  Event,
  ProcessEvent,
  RejectionEvent,
  ResolutionEvent,
  CancellationEvent,
} from 'mgfx/dist/middleware/instrumenter';
import { fluent } from 'mgfx/dist/utils/fluenture';
import { Initializer, Storage } from '@mgfx/analyzer/dist/storage';
import { resolve } from 'fluture';
import { join } from 'path';
import DB from 'better-sqlite3-helper';
import { Database } from 'better-sqlite3';

import * as statements from './statements';
import * as spans from './queries/spans';
import { all, switchEvent, encodeEvent } from './utils';

export type Config = {
  filename: string;
  forceMigrations?: 'last' | false;
};

export const sqlite: Initializer<Partial<Config>> = (config) => {
  const {
    filename = join('.', 'mgfx-analyzer.sqlite'),
    forceMigrations,
  } = config;

  // @ts-ignore
  const db: Database = new DB({
    path: filename,
    migrate: {
      force: forceMigrations,
      table: 'migrations',
      migrationsPath: join(__dirname, 'migrations'),
    },
  });

  db.pragma('foreign_keys = OFF');

  const cacheValue = db.prepare(statements.cacheValue);
  const updateSpan = db.prepare(statements.updateSpan);
  const putEventProcess = db.prepare(statements.putEventProcess);
  const putEventRejection = db.prepare(statements.putEventRejection);
  const putEventResolution = db.prepare(statements.putEventResolution);
  const putEventCancellation = db.prepare(statements.putEventCancellation);

  const putEvent = switchEvent<void, any>({
    process: db.transaction((event: ProcessEvent, [input, context]) => {
      cacheValue.run(input);
      cacheValue.run(context);

      putEventProcess.run({
        input,
        context,
        timestamp: event.timestamp,
        processSpecName: event.process.spec.name,
        processId: event.process.id,
        processParentId: event.process.parentId,
        contextId: event.process.context?.id ?? undefined,
        contextParentId: event.process.context?.parentId ?? undefined,
      });

      updateSpan.run(event.process.id);
    }),

    rejection: db.transaction((event: RejectionEvent, reason) => {
      cacheValue.run(reason);
      putEventRejection.run({
        reason,
        timestamp: event.timestamp,
        id: event.id,
      });
      updateSpan.run(event.id);
    }),

    resolution: db.transaction((event: ResolutionEvent, value) => {
      cacheValue.run(value);
      putEventResolution.run({
        value,
        timestamp: event.timestamp,
        id: event.id,
      });
      updateSpan.run(event.id);
    }),

    cancellation: db.transaction((event: CancellationEvent) => {
      putEventCancellation.run({
        timestamp: event.timestamp,
        id: event.id,
      });
      updateSpan.run(event.id);
    }),
  });

  const putEvents = db.transaction((events: Event[], encodedValues: any[]) => {
    events.forEach((event, index) => {
      const values = encodedValues[index];
      putEvent(event, values);
    });
  });

  const self: Storage = {
    put: {
      event: (event) =>
        encodeEvent(event)
          .pipe(fluent)
          .map((values) => {
            putEvent(event, values);
          }),

      events: (events) =>
        all(events.map((event) => encodeEvent(event)))
          .pipe(fluent)
          .map((eventValues) => {
            putEvents(events, eventValues);
          }),
    },
    query: {
      spans: (params) =>
        spans
          .buildQuery(params)
          .pipe(fluent)
          .map((query) => {
            const { sql, bindings } = query.toSQL();
            return db.prepare(sql).all(bindings);
          })
          .chain(spans.formatResult(params)),
    },
  };

  return resolve(self);
};
