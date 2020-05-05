import { Fluent } from 'mgfx/dist/utils/fluenture';

declare const stringP: Promise<string>;
declare const isAllowedP: (input: number) => Promise<boolean>;

declare const stringF: Fluent<any, string>;
declare const isAllowedF: (input: number) => Fluent<any, boolean>;

stringP
  // `.then` may return a value...
  .then((str) => str.length)
  // ...or another Promise
  .then((len) => isAllowedP(len));

stringF
  // *must* use `.map` to return a value...
  .map((str) => str.length)
  // ...*must* use `.chain` to return another Future
  .chain((len) => isAllowedF(len));
