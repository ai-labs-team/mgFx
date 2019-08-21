import Bluebird from 'bluebird';

export type TaskConstructor<T extends Task = Task> =
  new (config: Config<any>) => T

export type TaskParameters<T extends TaskConstructor> = Parameters<InstanceType<T>['run']>;

export type TaskValue<T extends TaskConstructor> =
  InstanceType<T> extends Task<infer U> ? U : never;

export type Serializable =
  | boolean
  | number
  | string
  | null
  | SerializableObject
  | SerializableArray

export interface SerializableObject {
  [key: string]: Serializable
}

export interface SerializableArray extends Array<Serializable> { }

type Config<Value> = {
  resolve: (value: Value) => void
  reject: (reason: Serializable) => void
  exec: <U extends TaskConstructor<any>>(task: U, ...args: TaskParameters<U>) =>
    Bluebird<TaskValue<U>>;
}

export abstract class Task<Value extends (Serializable | void) = void> {
  protected resolve: Config<Value>['resolve'];
  protected reject: Config<Value>['reject'];
  protected exec: Config<Value>['exec'];

  constructor(config: Config<Value>) {
    this.resolve = config.resolve;
    this.reject = config.reject;
    this.exec = config.exec;
  }

  abstract run(...args: Serializable[]): void;

  dispose(): void { };
}

/**
export const Pipe = <T0 extends TaskConstructor<any>>(
  task: T0,
  ...tasks: Array<TaskConstructor<any>>
) => class Pipe extends Task<any> {
    run(...args: TaskParameters<T0>) {
      Bluebird.reduce([task, ...tasks], (prev, task) => this.exec(task, prev), args)
        .then(this.resolve)
        .catch(this.reject)
    }
  }

export abstract class Pipe<Value extends (Serializable | void)> extends Task<Value> {
  public abstract tasks: Array<TaskConstructor<any>>;

  run(args: Serializable[]): void {
    Bluebird.reduce(this.tasks, (prev, task) => this.exec(task, prev), args)
      .then(this.resolve as any)
      .catch(this.reject)
  }
}
**/
