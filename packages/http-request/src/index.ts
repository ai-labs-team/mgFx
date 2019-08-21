import axios, { AxiosResponse, CancelTokenSource, Method, AxiosBasicCredentials } from 'axios';
import { Task } from 'mgfx';
import { Serializable, SerializableObject } from 'mgfx/dist/Task';

export type Config = {
  url: string;
} & Partial<{
  method: Method;
  baseURL: string;
  headers: SerializableObject;
  params: SerializableObject;
  data: Serializable;
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

export type HttpResponse<T extends Serializable> =
  Omit<AxiosResponse<T>, 'config' | 'request'>

export class HttpRequest<T extends Serializable = Serializable> extends Task<HttpResponse<T>> {
  protected cancelToken!: CancelTokenSource;

  run(config: Config) {
    this.cancelToken = axios.CancelToken.source();

    axios({
      ...config,
      cancelToken: this.cancelToken.token
    })
      .then(response => this.resolve({
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      }))
      .catch(this.reject)
  }

  dispose() {
    this.cancelToken.cancel();
  }
}
