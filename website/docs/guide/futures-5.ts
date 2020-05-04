import { Fluent } from 'mgfx/dist/utils/fluenture';
import { parallel } from 'fluture';

declare const somePromises: Array<Promise<string>>;

declare const someFutures: Array<Fluent<any, string>>;

// A Promise that will resolve when all input Promises have resolved.
Promise.all(somePromises);

// A Future that will resolve when all input Futures has resolved.
// Limits the maximum concurrency to 5
parallel(5)(someFutures);

// Consider using a concurrency of `Infinity` to mirror `Promise.all`.
