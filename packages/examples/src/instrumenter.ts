import { singleProcess, Instrumenter, Task } from 'mgfx';
import { Timeout } from '@mgfx/tasks';

class RandomNumber extends Task<number> {
  run(min: number, max: number) {
    const range = max - min;

    this.resolve(min + Math.floor(Math.random() * range));
  }
}

class RandomNumbers extends Task<number[]> {
  run(min: number, max: number, count: number) {
    const results = [];

    for (let i = 0; i < count; i += 1) {
      results.push(
        this.exec(Timeout, 100)
          .then(() => this.exec(RandomNumber, min, max))
      );
    }

    Promise.all(results)
      .then(this.resolve)
      .catch(this.reject);
  }
}

const { scheduler } = singleProcess({
  tasks: [
    RandomNumber,
    RandomNumbers,
    Timeout
  ]
});

new Instrumenter({ scheduler });

scheduler.exec(RandomNumber, 1, 10)
  .then(count => scheduler.exec(RandomNumbers, 1, 100, count))
  .then(console.log.bind(console, 'Random Numbers:'))
