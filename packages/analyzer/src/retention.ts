import { Fluenture, fluent } from 'mgfx/dist/utils/fluenture';
import { after, go, FutureInstance, reject } from 'fluture';

import { Storage } from '.';

export type Config = {
  maxAge: number;
  checkInterval: number;
};

export type ExpireOptions = Omit<Config, 'checkInterval'>;

export type Expire = (options: ExpireOptions) => FutureInstance<any, number>;

export type Options = {
  storage: Fluenture<any, Storage>,
  config?: Config
};

export type Handler = Fluenture<any, never>;

export const makeHandler = ({ storage, config }: Options): Handler => {
  if (!config) {
    return reject('Retention has not been configured').pipe(fluent);
  }

  return storage
    .map((storage) => {
      if (!storage.expire) {
        throw new Error('Storage does support Retention.');
      }

      return storage.expire;
    })
    .chain((expire) => go(function* () {
      while (true) {
        yield expire({ maxAge: config.maxAge });
        yield after(config.checkInterval)(undefined);
      }
    }));
  };