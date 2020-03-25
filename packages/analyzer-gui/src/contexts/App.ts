import { createContext, useContext } from 'react';
import { Analyzer } from '@mgfx/analyzer';

type AppContext = {
  showConfig: () => void;
  client: Analyzer;
};

export const AppContext = createContext<AppContext>(undefined);

export const useAppContext = () => useContext(AppContext);
