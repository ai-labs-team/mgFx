import { CustomError } from 'ts-custom-error';
import { AxiosResponse, AxiosError } from 'axios';

export class HttpRequestError extends CustomError {
  public readonly response?: {
    readonly status: number;
    readonly headers: any;
    readonly data: any;
  };

  constructor(message: string, response?: AxiosResponse<any>) {
    super(message);

    if (response) {
      this.response = {
        status: response.status,
        headers: response.headers,
        data: response.data
      };
    }
  }
}
