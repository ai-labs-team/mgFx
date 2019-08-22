#!/usr/bin/env node
import yargs from 'yargs';

import { sqlite } from './sqlite';

yargs
  .command(sqlite)
  .demandCommand()
  .help()
  .argv;
