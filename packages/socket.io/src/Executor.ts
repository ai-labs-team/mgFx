import io from 'socket.io-client';
import * as base from 'mgfx/dist/Executor';

type Config = base.Config & {
  uri: string;
}

export class Executor extends base.Executor {
  protected _id!: string;
  protected _client: SocketIOClient.Socket;

  constructor(protected readonly _config: Config) {
    super(_config);

    this._client = io(_config.uri);

    this._client.on('message', this._receive.bind(this));

    this._client.on('connect', () => {
      this._id = this._client.id;
      this._ready();
    });
  }

  protected _send(message: base.Message) {
    this._client.send(message);
  }
}
