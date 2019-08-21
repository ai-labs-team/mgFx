import Bluebird from 'bluebird';
import uuid from 'uuid/v4';

import { Scheduler } from './Scheduler';
import { TaskConstructor, TaskParameters, TaskValue } from './Task';

export type Labels = {
  [key: string]: string
}

export type Config = {
  labels: Labels;
  parentId?: string;
  scheduler: Scheduler;
}

export class Context {
  public readonly id = uuid();

  public readonly labels: Labels;

  protected readonly _scheduler: Scheduler;

  constructor(_config: Config) {
    this.labels = _config.labels;
    this._scheduler = _config.scheduler;

    // @todo: Not too sure about 'stealing' ownership of the Scheduler's emitter
    this._scheduler.emit(['createContext'], this.id, _config.parentId, _config.labels);
  }

  public createChild(config: Omit<Config, 'scheduler' | 'parentId'>) {
    return new Context({
      ...config,
      scheduler: this._scheduler,
      parentId: this.id,
    });
  }

  public exec<T extends TaskConstructor<any>>(task: T, ...args: TaskParameters<T>) {
    return this._scheduler.enqueue<TaskValue<T>>({
      contextId: this.id,
      taskName: task.name,
      args
    }, { promisify: true });
  }
}
