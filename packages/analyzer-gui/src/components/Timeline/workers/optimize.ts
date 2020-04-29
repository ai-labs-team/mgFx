import { exposeTimedWorker, TimedOutput } from 'src/worker';
import { optimize } from '../renderer';

export type Input = Parameters<typeof optimize>;
export type Output = TimedOutput<typeof optimize>;

exposeTimedWorker((...args: Input) => {
  if (!args[0]) {
    return [];
  }

  return optimize(...args);
});
