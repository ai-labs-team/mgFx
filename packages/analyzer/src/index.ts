import { deepEqual } from 'fast-equals';
import { Emitter, Stream, stream as _stream } from 'kefir';
import { makeInstrumenter } from 'mgfx/dist/middleware/instrumenter';
import { Bundle } from 'mgfx/dist/middleware';
import { fork } from 'mgfx';
import {
  FutureInstance,
  cache,
  chain,
  fork as _fork,
  parallel,
  map
} from 'fluture';

import { Storage } from './storage';
import { Interface, Span, SpanParameters } from './query';

export type Config = {
  storage: FutureInstance<any, Storage>;
};

export type Analyzer = {
  collector: Bundle;
  query: {
    spans: Interface<SpanParameters, Span[]>;
  };
};

export const makeAnalyzer = (config: Config): Analyzer => {
  const storage = cache(config.storage);

  const emitters = new Map<
    Stream<any, any>,
    [SpanParameters, Emitter<any, any>]
  >();

  const self: Analyzer = {
    collector: makeInstrumenter({
      receiver: event => {
        storage
          .pipe(chain(storage => storage.put.event(event)))
          .pipe(
            chain(() => {
              /**
               * This naive approach will trigger a call to `self.query.spans().get()` for *every* event that is
               * received. We then rely on Kefir's `skipDuplicates` filter to ensure that only relevant updates are
               * sent further downstream.
               *
               * The first way to optimize this may be to aggregate the observers based on query (ie, if multiple
               * watchers are using the same query parameters, we should only need to call `query.spans().get()` once
               * for all of them.)
               *
               * After that, we'd probably need to do some potentially complicated study of the query parameters to
               * figure out if a re-query is needed at all.
               *
               * I'm hoping that despite the naivity of this approach, it's sufficiently performant for most use-cases.
               */
              const notifyStreams = Array.from(emitters.values()).map(
                ([params, emitter]) =>
                  self.query
                    .spans(params)
                    .get()
                    .pipe(map(emitter.emit))
              );

              return parallel(Infinity)(notifyStreams);
            })
          )
          .pipe(fork.toBackground);
      }
    }),

    query: {
      spans: query => ({
        get: () => storage.pipe(chain(storage => storage.query.spans(query))),

        watch: () => {
          const stream = _stream<Span[], any>(emitter => {
            const cancel = self.query
              .spans(query)
              .get()
              .pipe(
                _fork(emitter.error)(spans => {
                  emitter.emit(spans);
                  emitters.set(stream, [query, emitter]);
                })
              );

            return () => {
              cancel();
              emitters.delete(stream);
            };
          });

          return stream.skipDuplicates(deepEqual);
        }
      })
    }
  };

  return self;
};

export { Storage, SpanParameters, Span };
