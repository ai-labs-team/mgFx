import { EventEmitter2 } from 'eventemitter2';
import uuid from 'uuid/v4';
import serializeError from 'serialize-error';
import colors from 'chalk';

import { ExecutionObserverMap } from './Scheduler';

export type Config = {
  concurrency: number
}

export type Message = {
  event: string | string[];
  args: any[];
}

export abstract class Executor extends EventEmitter2 {
  protected abstract readonly _id: string;

  protected _executionObservers: ExecutionObserverMap = new Map();

  protected _disposers = new Map<string, () => void>();

  constructor(protected readonly _config: Config) {
    super({
      wildcard: true
    });
  }

  protected _ready() {
    this._send({
      event: 'ready',
      args: [this._id, this._config.tasks.map(task => task.name)]
    })
  }

  protected _receive(message: Message) {
    this.emit(['received'].concat(message.event), ...message.args);

    if (message.event === 'execute') {
      this._execute(message.args[0], message.args[1], message.args[2]);
    }

    if (message.event[0] === 'resolved') {
      const [handleId, value] = message.args;

      if (this._executionObservers.has(handleId)) {
        const [resolve] = this._executionObservers.get(handleId)!;
        resolve(value);
      }
    }

    if (message.event[0] === 'rejected') {
      const [handleId, reason] = message.args;

      if (this._executionObservers.has(handleId)) {
        const [, reject] = this._executionObservers.get(handleId)!;
        reject(reason);
      }
    }

    if (message.event[0] === 'cancel') {
      const [handleId] = message.args;

      const disposer = this._disposers.get(handleId);
      disposer && disposer();
    }
  }

  protected _findTask(name: string) {
    return this._config.tasks.find(task => task.name === name);
  }

  protected _execute(handleId: string, taskName: string, args: any[]) {
    const Task = this._findTask(taskName)!;

    const instance = new Task({
      resolve: (value) => {
        this._send({
          event: ['resolved', handleId],
          args: [handleId, value]
        })

        this._disposers.delete(handleId);
      },

      reject: (reason) => {
        this._send({
          event: ['rejected', handleId],
          args: [handleId, reason]
        });

        this._disposers.delete(handleId);
      },

      // I don't like the inversion of control here. Ideally the scheduler would be responsible for generating the
      // execution handle based on the requirements and then send the ID back, but this introduces a race condition
      // whereby this (or another) executor potentially completes the execution of the child Task before we have the
      // information required to observe its outcome here.
      exec: <T extends TaskConstructor<any>>(task: T, ...args: TaskParameters<T>) => {
        const id = uuid();

        this._send({
          event: ['execChild'],
          args: [
            id,
            handleId,
            task.name,
            args
          ]
        });

        return this._promisify(id) as Bluebird<TaskValue<T>>;
      }
    });

    if (instance.dispose) {
      this._disposers.set(handleId, instance.dispose.bind(instance));
    }

    try {
      instance.run(...args);
    } catch (err) {
      this._disposers.delete(handleId);

      this._send({
        event: ['rejected', handleId],
        args: [handleId, serializeError(err)]
      })
    }

    this._send({
      event: ['executing', handleId],
      args: [handleId]
    })

    this.emit(['executing', handleId], handleId);
  }

  protected _promisify(handleId: string) {
    return new Bluebird((resolve, reject, onCancel) => {
      this._executionObservers.set(handleId, [resolve, reject]);

      onCancel!(() => {
        this.emit(['cancel', handleId]);
      })
    })
      .finally(() => {
        this._executionObservers.delete(handleId);
      });
  }

  protected abstract _send(message: Message): void;
}
