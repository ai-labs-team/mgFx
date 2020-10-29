import React from 'react';
import { hot } from 'react-hot-loader';
import { HashRouter } from 'react-router-dom';
import { httpClient } from '@mgfx/analyzer-http-client';
import { Button, Tooltip } from '@blueprintjs/core';

import { Header } from '@mgfx/analyzer-gui-common/components/Header';
import { ThemeHandler } from '@mgfx/analyzer-gui-common/components/ThemeHandler';
import { AppContext } from '@mgfx/analyzer-gui-common/contexts/App';
import { Routes } from '@mgfx/analyzer-gui-common/Routes';

import '@mgfx/analyzer-gui-common/styles';

import * as config from './config';
import { ServerDialog } from './ServerDialog';

const App: React.FC = () => {
  const [selectedServer, setSelectedServer] = React.useState<
    config.Server | undefined
  >();

  const appContext = React.useMemo<AppContext>(
    () => ({
      client: selectedServer
        ? httpClient({
            baseUrl: selectedServer.baseUrl,
            watchDeltas: selectedServer.deltas,
            fetch,
            EventSource,
          })
        : undefined,
      workers: {
        render: () =>
          new Worker('./workers/render', {
            name: 'render',
            type: 'module',
          }),
        optimize: () =>
          new Worker('./workers/optimize', {
            name: 'optimize',
            type: 'module',
          }),
      },
      config,
    }),
    [selectedServer]
  );

  return (
    <AppContext.Provider value={appContext}>
      <ServerDialog isOpen={!selectedServer} onSelect={setSelectedServer} />
      <ThemeHandler />
      {selectedServer && (
        <HashRouter>
          <Header>
            <Tooltip content="Change/Modify Server Connection">
              <Button
                minimal
                icon="offline"
                onClick={() => setSelectedServer(undefined)}
              />
            </Tooltip>
          </Header>
          <Routes />
        </HashRouter>
      )}
    </AppContext.Provider>
  );
};

export default hot(module)(App);
