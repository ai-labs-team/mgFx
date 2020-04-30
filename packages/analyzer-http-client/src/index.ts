import { Event, makeInstrumenter } from 'mgfx/dist/middleware/instrumenter';
import { Analyzer } from '@mgfx/analyzer';
import { value } from '@mgfx/codecs';
import { map, chain, encaseP, fork } from 'fluture';
import { stream } from 'kefir';

export type Config = {
  baseUrl: string;
  fetch: typeof fetch;
  EventSource: typeof EventSource;
};

export const httpClient = (config: Config): Analyzer => {
  const { baseUrl, fetch, EventSource } = config;

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

    query: {
      spans: params => {
        const url = `${baseUrl}/query/spans`;
        const paramsF = value.encode(params).pipe(map(encodeURIComponent));

        return {
          get: () =>
            paramsF
              .pipe(chain(encaseP(params => fetch(`${url}?q=${params}`))))
              .pipe(chain(encaseP(response => response.json()))),

          watch: () =>
            stream(emitter => {
              let eventSource: EventSource;

              const cancel = paramsF.pipe(
                fork(console.error)(params => {
                  eventSource = new EventSource(`${url}/observe?q=${params}`);
                  eventSource.addEventListener('message', message => {
                    emitter.emit(JSON.parse(message.data));
                  });

                  eventSource.addEventListener('error', error => {
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
            })
        };
      }
    }
  };
};
