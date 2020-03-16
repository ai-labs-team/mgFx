import { Analyzer } from '@mgfx/analyzer';
import { value } from '@mgfx/codecs';
import { map, reject, chain, encaseP, fork } from 'fluture';
import { stream } from 'kefir';

export type Config = {
  baseUrl: string;
};

export const httpClient = (config: Config): Analyzer => ({
  collector: {
    pre: () => reject(new Error('Not implemented yet.')),
    post: () => reject(new Error('Not implemented yet.'))
  },

  query: {
    spans: params => {
      const url = `${config.baseUrl}/query/spans`;
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
});
