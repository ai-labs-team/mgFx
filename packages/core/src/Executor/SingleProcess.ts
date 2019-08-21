import { EventEmitter2 } from 'eventemitter2';
import { Config as BaseConfig, Executor, Message } from '../Executor';

type Config = BaseConfig & {
  emitter: EventEmitter2;
}

export class SingleProcess extends Executor {
  protected _id = 'singleProcessExecutor';

  constructor(protected readonly _config: Config) {
    super(_config);

    _config.emitter.on('fromScheduler', this._receive.bind(this))
    this._ready();
  }

  protected _send(message: Message) {
    this._config.emitter.emit('fromExecutor', message);
  }
}
