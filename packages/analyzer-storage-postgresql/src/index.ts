import { Initializer, Storage } from '@mgfx/analyzer/dist/storage';
import { attemptP, encaseP, map } from 'fluture';
import pgPromise from 'pg-promise';
import { IConnectionParameters } from 'pg-promise/typescript/pg-subset';

import * as migrations from './migrations';
import { buildQuery as buildEventsQuery } from './queries/events';
import { buildQuery as buildSpansQuery, formatRows } from './queries/spans';

export type Config = {
  database: string | IConnectionParameters;
  migrations?: migrations.Options;
};

const opts = {};
const pgp = pgPromise(opts);

export const postgresql: Initializer<Config> = (config) => {
  const db = pgp(config.database);

  return migrations.apply(db, config.migrations).pipe(
    map(
      (): Storage => ({
        put: {
          event: encaseP((event) => db.none(buildEventsQuery(event))),

          events: encaseP((events) =>
            db.task((t) =>
              t.batch(events.map((event) => t.none(buildEventsQuery(event))))
            )
          ),
        },

        query: {
          spans: (params) => {
            const { sql, bindings } = buildSpansQuery(params)
              .toSQL()
              .toNative();

            return attemptP(() => db.manyOrNone(sql, bindings)).pipe(
              map(formatRows(params))
            );
          }
        },
      })
    )
  );
};
