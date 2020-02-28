import { makeInstrumenter } from 'mgfx/dist/middleware/instrumenter';
import logger, { LoggerOptions } from 'pino';

export const pino = (options: LoggerOptions = {}) => {
  const log = logger(options);

  return makeInstrumenter({
    receiver: event => {
      if (event.kind === 'process') {
        log.info({
          msg: 'process',
          process: {
            taskName: event.process.spec.name,
            input: event.process.input,
            id: event.process.id,
            parentId: event.process.parentId
          },
          context: event.process.context
        });
      }

      if (event.kind === 'rejection') {
        log.error({
          msg: 'rejection',
          id: event.id,
          err: event.reason
        });
      }

      if (event.kind === 'resolution') {
        log.info({
          msg: 'resolution',
          id: event.id,
          value: event.value
        });
      }

      if (event.kind === 'cancellation') {
        log.info({
          msg: 'cancellation',
          id: event.id
        });
      }
    }
  });
};
