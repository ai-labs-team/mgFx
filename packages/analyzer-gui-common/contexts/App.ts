import { createContext, useContext } from 'react';
import { Analyzer } from '@mgfx/analyzer';

import {
  GetConfig,
  GetKey,
  SetConfig,
  SetKey,
  WatchConfig,
  WatchKey,
} from '../config';

export type AppContext = {
  client?: Analyzer;
  config: {
    getConfig: GetConfig;
    getKey: GetKey;
    setConfig: SetConfig;
    setKey: SetKey;
    watchConfig: WatchConfig;
    watchKey: WatchKey;
  };
  workers: {
    render: () => Worker;
    optimize: () => Worker;
  };
};

export const AppContext = createContext<AppContext>(undefined);

export const useAppContext = () => useContext(AppContext);
