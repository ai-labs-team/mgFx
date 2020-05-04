import { attemptP, encaseP } from 'fluture';
import { Fluent } from 'mgfx/dist/utils/fluenture';

declare const stringF: Fluent<any, string>;
declare const isAllowedP: (input: number) => Promise<boolean>;

// (input: number) => Future<unknown, boolean>;
const isAllowedF = encaseP(isAllowedP);

// Future<unknown, boolean>;
const is99Allowed = attemptP(() => isAllowedP(99));

// Interop
stringF
  .map((str) => str.length)
  .chain(isAllowedF)
  // Future<any, boolean>
  .value((isAllowed) => {});
