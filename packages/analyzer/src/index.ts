import { deepEqual } from 'fast-equals';
import { Emitter, Stream, stream as _stream } from 'kefir';
import { MiddlewareFn } from 'mgfx/dist/connector';
import { makeInstrumenter, Event } from 'mgfx/dist/middleware/instrumenter';
import { fluent } from 'mgfx/dist/utils/fluenture';
import { fork } from 'mgfx';
import {
  FutureInstance,
  cache,
  chain,
  fork as _fork,
  parallel,
  map,
} from 'fluture';

import { Storage } from './storage';
import { Interface, Span, SpanParameters } from './query';
import { makeReceiver } from './receiver';

export type Config = {
  storage: FutureInstance<any, Storage>;
  buffer?: Partial<{
    enabled: true;
    time: number;
    count: number;
  }>;
};

export type Receiver = (event: Event) => void;

export type Analyzer = {
  receiver: Receiver;
  collector: MiddlewareFn;
  query: {
    spans: Interface<SpanParameters, Span[]>;
  };
};

const all = parallel(Infinity);

export const makeAnalyzer = (config: Config): Analyzer => {
  const storage = fluent(config.storage).cache();

  const emitters = new Map<
    Stream<any, any>,
    [SpanParameters, Emitter<any, any>]
  >();

  /**
   * This naive approach will trigger a call to `self.query.spans().get()` for *every* event that is received and
   * successfully flushed to the Storage provider. We then rely on Kefir's `skipDuplicates` filter to ensure that only
   * relevant updates are sent further downstream.
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
  const notifyStreams = () => {
    const streams = Array.from(emitters.values()).map(([params, emitter]) =>
      self.query.spans(params).get().pipe(map(emitter.emit))
    );

    all(streams).pipe(fork.toBackground);
  };

  const receiver = makeReceiver(storage, notifyStreams, config.buffer);

  const self: Analyzer = {
    receiver,

    collector: makeInstrumenter({ receiver }),

    query: {
      spans: (query) => ({
        get: () => storage.pipe(chain((storage) => storage.query.spans(query))),

        watch: () => {
          const stream = _stream<Span[], any>((emitter) => {
            const cancel = self.query
              .spans(query)
              .get()
              .pipe(
                _fork(emitter.error)((spans) => {
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
        },
      }),
    },
  };

  return self;
};

export { Storage, SpanParameters, Span };
