import React from 'react';
import { hot } from 'react-hot-loader';
import { HashRouter, Route } from 'react-router-dom';
import { httpClient } from '@mgfx/analyzer-http-client';
import EventSource from 'eventsource';

import { Header } from './Header';
import { ConfigDialog } from './ConfigDialog';
import { Log } from '../routes/Log';
import { useKey } from '../hooks/useConfig';
import { AppContext } from '../contexts/App';
import { Server } from '../config';
import { ServerDialog } from './ServerDialog';

import './App.scss';

const App: React.FC = () => {
  const theme = useKey('theme');
  const [showConfig, setShowConfig] = React.useState(false);

  React.useEffect(() => {
    const body = document.body;
    theme === 'dark'
      ? body.classList.add('bp3-dark')
      : body.classList.remove('bp3-dark');
  }, [theme]);

  const [selectedServer, setSelectedServer] = React.useState<
    Server | undefined
  >();

  const client = React.useMemo(
    () =>
      selectedServer
        ? httpClient({
            baseUrl: selectedServer.baseUrl,
            fetch,
            EventSource
          })
        : undefined,
    [selectedServer]
  );

  const appContext = React.useMemo(
    () => ({
      client,
      showConfig: () => setShowConfig(true)
    }),
    [client]
  );

  return (
    <AppContext.Provider value={appContext}>
      <ServerDialog isOpen={!selectedServer} onSelect={setSelectedServer} />
      {selectedServer ? (
        <HashRouter>
          <Header />
          <div className="content">
            <Route path="/" component={Log} />
            <ConfigDialog
              isOpen={showConfig}
              onClose={() => setShowConfig(false)}
            />
          </div>
        </HashRouter>
      ) : null}
    </AppContext.Provider>
  );
};

export default hot(module)(App);
