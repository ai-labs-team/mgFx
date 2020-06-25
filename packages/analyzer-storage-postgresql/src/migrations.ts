import { RunnerOptionConfig } from 'node-pg-migrate/dist/types';
import migrate from 'node-pg-migrate';
import { and, attempt, attemptP, hook } from 'fluture';
import { join } from 'path';
import { IDatabase, IConnected } from 'pg-promise';

export const DEFAULT_OPTIONS: RunnerOptionConfig = {
  migrationsTable: 'pgmigrations',
  dir: join(__dirname, 'migrations'),
  direction: 'up',
  count: Number.MAX_SAFE_INTEGER,
};

export type Options = Partial<
  RunnerOptionConfig & {
    force: boolean;
  }
>;

export const apply = (
  db: IDatabase<any, any>,
  options: Options = {}
) => {
  const getConnection = attemptP(() => db.connect());
  const releaseConnection = ({ done }: IConnected<any, any>) => attempt(done);

  const applyMigrations = ({ client }: IConnected<any, any>) => {
    const down = attemptP(() =>
      migrate({
        dbClient: client as any,
        ...options,
        ...DEFAULT_OPTIONS,
        direction: 'down',
      })
    );

    const up = attemptP(() =>
      migrate({
        dbClient: client as any,
        ...options,
        ...DEFAULT_OPTIONS
      })
    );

    return options.force ? down.pipe(and(up)) : up;
  };

  return hook(getConnection)(releaseConnection)(applyMigrations);
};