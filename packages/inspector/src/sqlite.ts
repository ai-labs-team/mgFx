import { join } from 'path';
import { Database, OPEN_READONLY } from 'sqlite3';
import yargs from 'yargs';

import { Args as BaseArgs } from './';
import { Adapter } from './sqlite/Adapter';
import { Inspector } from './Inspector';

type Args = BaseArgs & {
  dbFile: string;
}

export const sqlite: yargs.CommandModule<{}, Args> = {
  command: 'sqlite [dbFile]',
  describe: 'Use recordings from a sqlite database',
  builder: {
    dbFile: {
      default: join(process.cwd(), 'mgfx_recorder.db'),
      describe: 'The name of the sqlite database containing recordings'
    }
  },
  handler: (args) => {
    const db = connect(args.dbFile);
    const adapter = new Adapter(db);

    new Inspector({ adapter, args });
  }
}

const connect = (dbFile: string) => {
  const db = new Database(dbFile, OPEN_READONLY, err => {
    if (err) {
      console.error(`mgFx Inspector: Failed to read sqlite database ${dbFile}:`, err);
      process.exit(1);
    }

    console.log(`mgFx Inspector: Successfully loaded sqlite database ${dbFile}`);
  });

  return db;
}
