import { join } from 'path';
import { Database, Statement } from 'sqlite3';
import yargs from 'yargs'

import { processor, Message } from './processor';
import { schema } from './sqlite/schema';
import * as _queries from './sqlite/queries';

type Args = {
  dbFile: string
}

export const sqlite: yargs.CommandModule<{}, Args> = {
  command: 'sqlite [dbFile]',
  describe: 'Record to a sqlite database',
  builder: {
    dbFile: {
      default: join(process.cwd(), 'mgfx_recorder.db'),
      describe: 'The name of the sqlite database to record to'
    }
  },
  handler: (argv) => {
    const db = connect(argv.dbFile);
    init(db);
    const queries = bindStatements(db);

    // Ensures that we don't start processing lines until the database is fully prepared
    db.exec('PRAGMA noop', () => {
      processor({
        storeMessage: storeMessage(queries),
        storeEntity: storeEntity(queries)
      });
    });
  }
}

const connect = (dbFile: string) => {
  const db = new Database(dbFile, err => {
    if (err) {
      console.error(`mgFx Recorder: Failed to initialize sqlite database ${dbFile}:`, err);
      process.exit(1);
    }

    console.log(`mgFx Recorder: Successfully initialized sqlite database ${dbFile}`);
  })

  return db;
}

type QueryKey = keyof typeof _queries;

type PreparedStatements = {
  [K in QueryKey]: Statement
}

const bindStatements = (db: Database) =>
  Object.keys(_queries)
    .reduce((queries, key) => ({
      ...queries,
      [key]: db.prepare(_queries[key as QueryKey], (err) => {
        if (err) {
          console.error(`mgFx Recorder: Failed to prepare statement '${key}':'`, err);
          process.exit(1);
        }

        console.log(`mgFx Recorder: Successfully prepared statement '${key}'`);
      })
    }), {} as PreparedStatements)

const init = (db: Database) => {
  db.serialize();

  db.exec(schema, err => {
    if (err) {
      console.error('mgFx Recorder: Failed to initialize database schema:', err);
      process.exit(1);
    }

    console.log('mgFx Recorder: Successfully initialized database schema');
  });
}

const storeMessage = ({ insertMessage }: PreparedStatements) =>
  (message: Message) =>
    insertMessage.run({
      $hostname: message.hostname,
      $pid: message.pid,
      $time: new Date(message.time).getTime(),
      $msg: message.msg,
      $data: message.data ? JSON.stringify(message.data) : null
    })

const storeEntity = (statements: PreparedStatements) =>
  (message: Message) => {
    const common = {
      $id: message.data.id,
      $time: new Date(message.time).getTime()
    };

    if (message.msg === 'enqueued') {
      statements.upsertExecutionEnqueued.run({
        ...common,
        $contextId: message.data.contextId,
        $parentId: message.data.parentId,
        $taskName: message.data.taskName,
        $args: JSON.stringify(message.data.args)
      })
    }

    if (message.msg === 'executing') {
      statements.upsertExecutionExecuting.run({
        ...common,
        $executorId: message.data.executorId
      })
    }

    if (message.msg === 'resolved') {
      statements.upsertExecutionResolved.run({
        ...common,
        $value: JSON.stringify(message.data.value)
      });
    }

    if (message.msg === 'rejected') {
      statements.upsertExecutionRejected.run({
        ...common,
        $reason: JSON.stringify(message.data.reason)
      });
    }

    if (message.msg === 'cancelled') {
      statements.upsertExecutionCancelled.run(common);
    }

    if (message.msg === 'createContext') {
      statements.insertCreateContext.run({
        ...common,
        $parentId: message.data.parentId,
        $labels: JSON.stringify(message.data.labels)
      });
    }
  }
