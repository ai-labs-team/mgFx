import { Event } from 'mgfx/dist/middleware/instrumenter';
import { Initializer } from '@mgfx/analyzer/dist/storage';
import { attemptP, chain, encaseP, map } from 'fluture';
import { join } from 'path';
import { open, Database } from 'sqlite';
import { QueryBuilder } from 'knex';

import { bind } from './statements';
import * as spans from './queries/spans';

export type Config = {
  filename: string;
  forceMigrations: string;
};

type MigrateOptions = Parameters<Database['migrate']>[0];

const migrate = (options: MigrateOptions) =>
  encaseP((db: Database) => db.migrate(options));

export const sqlite: Initializer<Partial<Config>> = config => {
  const { filename = join('.', 'mgfx-analyzer.sqlite') } = config;

  return attemptP(() => open(filename))
    .pipe(
      chain(
        migrate({
          force: config.forceMigrations,
          migrationsPath: join(__dirname, 'migrations')
        })
      )
    )
    .pipe(
      chain(db => {
        const runQuery = encaseP((query: QueryBuilder) => {
          const { sql, bindings } = query.toSQL();
          return db.all(sql, bindings);
        });

        return bind(db).pipe(
          map(boundStatements => ({
            put: {
              event: (event: Event) => {
                if (event.kind === 'process') {
                  return boundStatements.putEventProcess(event);
                }

                if (event.kind === 'resolution') {
                  return boundStatements.putEventResolution(event);
                }

                if (event.kind === 'rejection') {
                  return boundStatements.putEventRejection(event);
                }

                if (event.kind === 'cancellation') {
                  return boundStatements.putEventCancellation(event);
                }

                throw new Error('Unable to store event');
              }
            },
            query: {
              spans: params =>
                spans
                  .buildQuery(params)
                  .pipe(chain(runQuery))
                  .pipe(chain(spans.formatResult))
            }
          }))
        );
      })
    );
};
