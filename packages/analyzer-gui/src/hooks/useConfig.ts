import { useEffect, useState } from 'react';

import { config, Schema } from '../config';

export const useKey = <K extends keyof Schema>(key: K): Schema[K] => {
  const [value, setValue] = useState(config.get(key));
  useEffect(() => config.onDidChange(key, setValue), [key]);

  return value;
};

export const useConfig = () => {
  const [state, setState] = useState(config.store);
  useEffect(() => config.onDidAnyChange(setState), []);

  return {
    state,
    setState,
    apply: (newState?: React.SetStateAction<Schema>) => {
      const toApply = newState
        ? typeof newState === 'function'
          ? newState(state)
          : newState
        : state;

      config.set(toApply);
    },
    reset: () => {
      setState(config.store);
    }
  };
};
