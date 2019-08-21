import yargs from 'yargs';
import { join } from 'path';

import { sqlite } from './sqlite';

yargs
  .command(sqlite)
  .demandCommand()
  .help()
  .argv;
