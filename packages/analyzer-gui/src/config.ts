import Store from 'electron-store';

import {
  Config,
  GetConfig,
  GetKey,
  SetConfig,
  SetKey,
  WatchConfig,
  WatchKey,
  defaults,
} from '@mgfx/analyzer-gui-common/config';

export type Server = {
  baseUrl: string;
  deltas?: boolean;
};

declare module '@mgfx/analyzer-gui-common/config' {
  interface Config {
    servers?: Server[];
  }
}

const store = new Store<Config>({
  schema: {
    logDisplayMode: {
      enum: ['list', 'tree'],
      default: defaults.logDisplayMode,
    },
    logParameters: {
      type: 'object',
      default: defaults.logParameters,
    },
    inspectorPosition: {
      enum: ['side', 'bottom'],
      default: defaults.inspectorPosition,
    },
    theme: {
      enum: ['light', 'dark'],
      default: defaults.theme,
    },
    servers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          deltas: {
            type: 'boolean',
            default: true,
          },
          baseUrl: {
            type: 'string',
            format: 'uri',
          },
        },
        required: ['baseUrl'],
      },
      default: [],
    },
  },
});

export const getConfig: GetConfig = () => store.store;

export const getKey: GetKey = store.get.bind(store);

export const setConfig: SetConfig = store.set.bind(store);

export const setKey: SetKey = store.set.bind(store);

export const watchConfig: WatchConfig = store.onDidAnyChange.bind(store);

export const watchKey: WatchKey = store.onDidChange.bind(store);
