import { useEffect, useState } from 'react';

import { Config, Value } from '../config';
import { useAppContext } from '../contexts/App';

export const useKey = <K extends keyof Config>(key: K) => {
  const { config } = useAppContext();
  const [value, setValue] = useState(config.getKey(key));
  useEffect(() => config.watchKey(key, setValue), [key]);

  return [value, (value: Value<K>) => config.setKey(key, value)] as const;
};

export const useConfig = () => {
  const { config } = useAppContext();
  const [state, setState] = useState(config.getConfig());
  useEffect(() => config.watchConfig(setState), []);

  return {
    state,
    setState,
    apply: (newState?: React.SetStateAction<Config>) => {
      const toApply = newState
        ? typeof newState === 'function'
          ? newState(state)
          : newState
        : state;

      config.setConfig(toApply);
    },
    revert: () => {
      setState(config.getConfig());
    },
  };
};
