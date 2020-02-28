import { fork as _fork, resolve, reject } from 'fluture';
export { local as localConnector } from './connector/local';
export { define, implement } from './task';
import { Validator } from './validator';
import { ValidationError } from './validator';

const rejected = console.error.bind(console, '\x1b[31mREJECTED\x1b[0m');
const resolved = console.log.bind(console, '\x1b[32mRESOLVED\x1b[0m');
const noop = () => {};

export const fork = {
  toConsole: _fork(rejected)(resolved),
  toBackground: _fork(noop)(noop)
};

export const validate = {
  void: (() => resolve(undefined)) as Validator<void>,
  string: ((value: unknown) =>
    typeof value === 'string'
      ? resolve(value)
      : reject(new ValidationError(`${value} is not a string!`))) as Validator<
    string
  >,
  number: ((value: unknown) =>
    typeof value === 'number'
      ? resolve(value)
      : reject(new ValidationError(`${value} is not a number!`))) as Validator<
    number
  >
};
