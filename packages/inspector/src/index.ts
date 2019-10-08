#!/usr/bin/env node
import yargs from 'yargs';

import { sqlite } from './sqlite';

export type Args = {
  port: number;
}

yargs
  .option('p', {
    alias: 'port',
    type: 'number',
    default: 8080,
    describe: 'The HTTP Port that the Inspector should listen on'
  })
  .command(sqlite)
  .demandCommand()
  .help()
  .argv;
