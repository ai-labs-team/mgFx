import { worker } from 'cluster';
import { Executor, Config, Message } from '../Executor';

export class IpcWorker extends Executor {
  protected _id = worker.id + '';

  constructor(protected readonly _config: Config) {
    super(_config);

    process.on('message', this._receive.bind(this));
    this._ready();
  }

  protected _send(message: Message) {
    this.emit('send', message);
    process.send!(message);
  }
}
