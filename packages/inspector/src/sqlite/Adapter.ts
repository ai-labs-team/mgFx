import { Database, Statement } from 'sqlite3';

import { Context, ContextTiming, Execution } from '@common/types';
import { DbAdapter, ContextsOptions, ExecutionsOptions, ContextTimingsOptions } from '../DbAdapter';

import * as queries from './queries';

export class Adapter implements DbAdapter {
  protected _queries: StatementMap<typeof queries>;

  constructor(protected _db: Database) {
    this._queries = bindStatements(_db, queries);
    _db.on('trace', console.log.bind(console));
  }

  contexts(options: ContextsOptions): Promise<Context[]> {
    return new Promise((resolve, reject) => {
      this._queries.contexts.all({
        $start: options.start,
        $end: options.end
      }, (err, contexts) => {
        err ? reject(err) : resolve(contexts)
      });
    })
  }

  contextTimings(options: ContextTimingsOptions): Promise<ContextTiming[]> {
    return new Promise((resolve, reject) => {
      this._queries.contextTimings.all({
        $start: options.start,
        $end: options.end
      }, (err, contextTimings) => {
        err ? reject(err) : resolve(contextTimings)
      })
    })
  }

  executions(options: ExecutionsOptions): Promise<Execution[]> {
    return new Promise((resolve, reject) => {
      const cb = (err: any, executions: Execution[]) => {
        err ? reject(err) : resolve(executions);
      }

      options.context ?
        this._queries.executionsInContext.all({
          $start: options.start,
          $end: options.end,
          $context: options.context
        }, cb) :
        this._queries.executions.all({
          $start: options.start,
          $end: options.end
        }, cb)
    });
  }

  execution(id: string): Promise<Execution> {
    return new Promise((resolve, reject) => {
      this._queries.execution.get({
        $id: id
      }, (err: any, execution: Execution) => {
        err ? reject(err) : resolve(execution);
      })
    })
  }
}

type QueryMap = {
  [name: string]: string;
}

type StatementMap<T extends QueryMap> = {
  [K in keyof T]: Statement;
}

const bindStatements = <T extends QueryMap>(db: Database, queries: T): StatementMap<T> =>
  Object.keys(queries)
    .reduce((statements, key) => ({
      ...statements,
      [key]: db.prepare(queries[key], err => {
        if (err) {
          console.error(`mgFx Inspector: Failed to prepare statement '${key}':`, err);
          process.exit(1);
        }

        console.log(`mgFx Inspector: Successfully prepared statement '${key}'`);
      })
    }), {} as StatementMap<T>)
