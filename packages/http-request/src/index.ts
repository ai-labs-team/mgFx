import axios, { AxiosResponse, Method, AxiosBasicCredentials } from 'axios';
import { Serializable, SerializableObject } from 'mgfx/dist/Serializable';
import { Future, FutureInstance } from 'fluture';

export type Config = { url: string; } & Partial<{
  method: Method;
  baseURL: string;
  headers: SerializableObject;
  params: SerializableObject;
  body: Serializable;
  timeout: number;
  auth: AxiosBasicCredentials;
  maxContentLength: number;
  maxRedirects: number;
  proxy: false | ({
    host: string;
    port: number;
  } & Partial<{
    auth: { username: string; password: string; }
    protocol: string;
  }>)
}>

export type Response<T extends Serializable> = Omit<AxiosResponse<T>, 'config' | 'request'>;
export type HttpFuture<Err extends Serializable, Res extends Serializable> = FutureInstance<Response<Err>, Response<Res>>;

export default <Err extends Serializable, Res extends Serializable>({ body, ...config }: Config): HttpFuture<Err, Res> => (
  new Future((reject, resolve) => {
    const cancelToken = axios.CancelToken.source();

    axios({ data: body, cancelToken: cancelToken.token, ...config })
      .then(({ data, status, statusText, headers }) => resolve({ data, status, statusText, headers }))
      .catch(reject);

    return cancelToken.cancel.bind(cancelToken);
  })
);
