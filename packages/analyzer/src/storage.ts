import { FutureInstance } from 'fluture';
import { Event } from 'mgfx/dist/middleware/instrumenter';
import { SpanParameters, Span } from './query';
import { Expire } from './retention';

/**
 * A Storage provider must be capable of accepting Instrumentation events via `put.event` and storing them in
 * persistent storage. It must also be capable of handling queries for analytic data such as Spans via `query.*`.
 *
 * It is expected that each Storage provider performs the aggregation of analytical data for maximum efficiency (for
 * example, via SQL views.)
 */
export type Storage = {
  put: {
    event: (event: Event) => FutureInstance<any, any>;
    events?: (events: Event[]) => FutureInstance<any, any>;
  };
  query: {
    spans: (params: SpanParameters) => FutureInstance<any, Span[]>;
  };
  expire?: Expire;
};

export type Initializer<Config> = (
  config: Config
) => FutureInstance<any, Storage>;
