export const scope = (prefix: string) => (constructor: Function) => {
  Object.defineProperty(constructor, 'name', { value: `${prefix}.${constructor.name}` });
};

type TaskSpec<Data> = {
  id: string;
  data: Data;
  options?: { [key: string]: any };
};

export class Task<Data> {

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