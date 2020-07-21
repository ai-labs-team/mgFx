import { Event, makeInstrumenter } from 'mgfx/dist/middleware/instrumenter';
import { Analyzer, Span } from '@mgfx/analyzer';
import { value } from '@mgfx/codecs';
import copy from 'fast-copy';
import { patch } from 'jsondiffpatch';
import { map, chain, encaseP, fork, never } from 'fluture';
import { stream } from 'kefir';
import { fluent } from 'mgfx/dist/utils/fluenture';

export type Config = {
  baseUrl: string;
  fetch: typeof fetch;
  EventSource: typeof EventSource;
  watchDeltas?: boolean;
};

export const httpClient = (config: Config): Analyzer => {
  const { baseUrl, fetch, EventSource, watchDeltas = false } = config;

  const receiver = Object.assign(
    (event: Event) => {
      const url = `${baseUrl}/collector`;

      fetch(url, {
        method: 'post',
        body: JSON.stringify(event),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    { shutdown: () => {} }
  );

  return {
    receiver,

    collector: makeInstrumenter({ receiver }),

    retention: never.pipe(fluent),

    query: {
      spans: (params) => {
        const url = `${baseUrl}/query/spans`;
        const paramsF = value.encode(params).pipe(map(encodeURIComponent));

        return {
          get: () =>
            paramsF
              .pipe(chain(encaseP((params) => fetch(`${url}?q=${params}`))))
              .pipe(chain(encaseP((response) => response.json()))),

          watch: () =>
            stream((emitter) => {
              let eventSource: EventSource;

              const cancel = paramsF.pipe(
                fork(console.error)((params) => {
                  eventSource = new EventSource(
                    `${url}/observe?q=${params}&deltas=${watchDeltas}`
                  );

                  let prevState: Span[] = [];

                  eventSource.addEventListener('message', (message) => {
                    try {
                      prevState = JSON.parse(message.data);
                    } catch (err) {
                      emitter.error(err);
                      return;
                    }

                    emitter.emit(prevState);
                  });

                  if (watchDeltas) {
                    eventSource.addEventListener('delta', (message: any) => {
                      try {
                        const delta = JSON.parse(message.data);
                        prevState = patch(copy(prevState), delta);
                      } catch (err) {
                        emitter.error(err);
                        return;
                      }

                      emitter.emit(prevState);
                    });
                  }

                  eventSource.addEventListener('error', (error) => {
                    emitter.error(error);
                  });
                })
              );

              return () => {
                cancel();

                if (eventSource) {
                  eventSource.close();
                }
              };
            }),
        };
      },
    },
  };
};
