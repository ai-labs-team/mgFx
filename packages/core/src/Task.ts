import Future, { FutureInstance } from "fluture";

export const scope = (prefix: string) => (constructor: Function) => {
  Object.defineProperty(constructor, 'name', { value: `${prefix}/${constructor.name}` });
};

type TaskSpec<Data> = {
  id: string | null;
  data: Data;
  options?: { [key: string]: any };
};

interface TaskConstructor<T extends Task<Data>, Data> {
  new(spec: TaskSpec<Data> | Task<Data>): T;
}

export class Task<Data> {

  public static handler<Data>(_: Task<Data>): FutureInstance<unknown, unknown> {
    return Future.reject(new Error("Unhandled"));
  }

  public static fromJSON<T extends Task<Data>, Data>(spec: TaskSpec<Data> | Task<Data>) {
    new (this as unknown as TaskConstructor<T, Data>)(spec);
  }

  public readonly id: string | null = null;
  public readonly data!: Data;
  public readonly options: { [key: string]: any } = {};

  constructor(spec: TaskSpec<Data>) {
    Object.freeze(Object.assign(this, spec));
  }

  toJSON() {
    return {
      id: this.id,
      data: this.data,
      options: this.options,
      type: this.constructor.name,
    };
  }
}