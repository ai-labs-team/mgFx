import { EventEmitter2 } from 'eventemitter2';

import { RoundRobin } from './DispatchStrategy/RoundRobin';
import { Config as ExecutorConfig } from './Executor';
import { Config as SchedulerConfig } from './Scheduler';
import { SingleProcess as Scheduler } from './Scheduler/SingleProcess';
import { SingleProcess as Executor } from './Executor/SingleProcess';

type Config =
  { scheduler?: SchedulerConfig }
  & (
    | { executor: ExecutorConfig }
    | { tasks: ExecutorConfig['tasks'] }
  )

export const singleProcess = (config: Config) => {
  const scheduler = config.scheduler || {
    dispatchStrategy: new RoundRobin()
  }

  const executor = 'executor' in config ?
    config.executor : {
      tasks: config.tasks,
      concurrency: 1
    }

  const emitter = new EventEmitter2();

  return {
    scheduler: new Scheduler({
      ...scheduler,
      emitter
    }),

    executor: new Executor({
      ...executor,
      emitter
    })
  }
}
