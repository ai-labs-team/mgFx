import { define, implement } from 'mgfx';
import { ioTs, t } from '@mgfx/validator-iots';
import axios, { AxiosError } from 'axios';
import { Future } from 'fluture';
import { HttpRequestError } from './error';

export const httpRequest = implement(
  define({
    name: 'httpRequest',
    input: ioTs(
      t.intersection([
        t.type({
          url: t.string,
          method: t.keyof({
            get: null,
            post: null,
            put: null,
            patch: null,
            delete: null
          })
        }),
        t.partial({
          data: t.any,
          headers: t.record(t.string, t.string),
          full: t.boolean
        })
      ])
    ),
    output: ioTs(t.any),
    context: {
      correlationId: ioTs(t.union([t.string, t.undefined]))
    }
  }),
  ({ url, method, data, headers, full }, { context: { correlationId = '' } }) =>
    Future((reject, resolve) => {
      const source = axios.CancelToken.source();

      axios({
        url,
        method,
        data,
        headers: correlationId
          ? {...headers, 'Correlation-Id': correlationId}
          : headers,
      })
        .then((response: any) =>
          resolve(
            full === true
              ? {
                  data: response.data,
                  status: response.status,
                  headers: response.headers
                }
              : response.data
          )
        )
        .catch((error: AxiosError) => {
          reject(new HttpRequestError(error.message, error.response));
        });

      return () => {
        source.cancel();
      };
    })
);
