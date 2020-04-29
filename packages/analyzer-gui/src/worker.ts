import { exposeWorker } from 'react-hooks-worker';

export const exposeTimedWorker = (fn: Function) => {
  exposeWorker((input: any) => {
    const start = performance.now();
    const value = fn(...input);
    const end = performance.now();

    return {
      value,
      time: end - start,
    };
  });
};

export type TimedOutput<T extends (...args: any[]) => any> = {
  value: ReturnType<T>;
  time: number;
};
