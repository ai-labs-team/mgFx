import { define, implement } from 'mgfx';
import { ioTs, t } from '@mgfx/validator-iots';
import axios, { AxiosError } from 'axios';
import { Future } from 'fluture';

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
          headers: t.record(t.string, t.string)
        })
      ])
    ),
    output: ioTs(t.any),
    context: {
      correlationId: ioTs(t.union([t.string, t.undefined]))
    }
  }),
  ({ url, method, data, headers }, { context: { correlationId = '' } }) =>
    Future((reject, resolve) => {
      const source = axios.CancelToken.source();

      axios({
        url,
        method,
        data,
        headers: {
          ...headers,
          'Correlation-Id': correlationId
        }
      })
        .then((response: any) => resolve(response.data))
        .catch((error: AxiosError) => {
          reject(new Error(error.message));
        });

      return () => {
        source.cancel();
      };
    })
);
