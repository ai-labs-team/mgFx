import { EventEmitter2 } from 'eventemitter2';
import { Config as BaseConfig, Message, Scheduler } from '../Scheduler';

type Config = BaseConfig & {
  emitter: EventEmitter2;
}

export class SingleProcess extends Scheduler {
  constructor(protected readonly _config: Config) {
    super(_config);

    _config.emitter.on('fromExecutor', message => {
      this._receive(message, 'singleProcessExecutor');
    })
  }

  protected _broadcast(message: Message) {
    this._config.emitter.emit('fromScheduler', message);
  }

  protected _send(_: string, message: Message) {
    this._config.emitter.emit('fromScheduler', message);
  }
}
