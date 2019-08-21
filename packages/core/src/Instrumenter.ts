import Logger, { createLogger } from 'bunyan';

import { ExecutionHandle, Scheduler } from './Scheduler';
import { Labels } from './Context';

type Config = {
  scheduler: Scheduler
}

export class Instrumenter {
  protected _logger: Logger;

  constructor(protected readonly _config: Config) {
    this._logger = createLogger({
      name: 'mgfx-instrumenter'
    });

    _config.scheduler.on(['enqueued', '*'], (id: string, handle: ExecutionHandle) => {
      this._logger.info({
        data: {
          ...handle,
          id
        }
      }, 'enqueued');
    });

    _config.scheduler.on(['executing', '*'], (id: string, executorId: string) => {
      this._logger.info({
        data: {
          id,
          executorId
        }
      }, 'executing');
    });

    _config.scheduler.on(['resolved', '*'], (id: string, value: any) => {
      this._logger.info({
        data: {
          id,
          value
        }
      }, 'resolved');
    });

    _config.scheduler.on(['rejected', '*'], (id: string, reason: any) => {
      this._logger.info({
        data: {
          id,
          reason
        }
      }, 'rejected');
    });

    _config.scheduler.on(['cancelled', '*'], (id: string) => {
      this._logger.info({
        data: {
          id
        }
      }, 'cancelled');
    });

    _config.scheduler.on(['createContext'], (id: string, parentId: string, labels: Labels) => {
      this._logger.info({
        data: {
          id,
          parentId,
          labels
        }
      }, 'createContext');
    })
  }
}
