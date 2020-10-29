import React from 'react';
import { HashRouter } from 'react-router-dom';
import { httpClient } from '@mgfx/analyzer-http-client';

import { Header } from '@mgfx/analyzer-gui-common/components/Header';
import { ThemeHandler } from '@mgfx/analyzer-gui-common/components/ThemeHandler';
import { AppContext } from '@mgfx/analyzer-gui-common/contexts/App';
import { Routes } from '@mgfx/analyzer-gui-common/Routes';
import '@mgfx/analyzer-gui-common/styles';

import * as config from './config';

export const App: React.FC = () => {
  const appContext = React.useMemo<AppContext>(
    () => ({
      client: httpClient({
        baseUrl: `//${window.location.host}`,
        fetch,
        EventSource,
      }),
      workers: {
        render: () =>
          new Worker(
            new URL(
              '@mgfx/analyzer-gui-common/routes/Explore/Timeline/Graph/workers/render',
              import.meta.url
            )
          ),
        optimize: () =>
          new Worker(
            new URL(
              '@mgfx/analyzer-gui-common/routes/Explore/Timeline/Graph/workers/optimize',
              import.meta.url
            )
          ),
      },
      config,
    }),
    []
  );

  return (
    <AppContext.Provider value={appContext}>
      <HashRouter>
        <ThemeHandler />
        <Header />
        <Routes />
      </HashRouter>
    </AppContext.Provider>
  );
};
