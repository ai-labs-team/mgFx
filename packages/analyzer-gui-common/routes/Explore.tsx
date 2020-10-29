import React from 'react';
import { Route } from 'react-router-dom';
import SplitPane from 'react-split-pane';
import { Span } from '@mgfx/analyzer';
import { useAppContext } from '@mgfx/analyzer-gui-common/contexts/App';
import { assoc, prop, tap } from 'ramda';
import { useKefir } from 'use-kefir';

import { useKey } from '../hooks/useConfig';
import { useSearch } from '../hooks/useSearch';
import { Log } from './Explore/Log';
import { Timeline } from './Explore/Timeline';
import { Inspector } from './Explore/Inspector';
import { StatusBar, ConnectionState } from './Explore/StatusBar';

import './Explore.scss';

const MAX_UPDATE_RATE = 4;
const UPDATE_THROTTLE_PERIOD = Math.floor(1000 / MAX_UPDATE_RATE);

export const Explore = () => {
  const [connectionState, setConnectionState] = React.useState<ConnectionState>(
    {
      kind: 'stale',
      timestamp: Date.now(),
    }
  );

  const [inspectorPosition] = useKey('inspectorPosition');
  const [params] = useKey('logParameters');
  const { client } = useAppContext();

  const spans = useKefir(
    client.query
      .spans({
        ...params,
        compact: true,
        order: {
          field: 'createdAt',
          direction: 'desc',
        },
      })
      .watch()
      .throttle(UPDATE_THROTTLE_PERIOD)
      .mapErrors(
        tap((error) => {
          setConnectionState({
            kind: 'error',
            timestamp: Date.now(),
            error,
          });
        })
      )
      .map(
        tap((spans) => {
          setConnectionState({
            kind: 'ok',
            timestamp: Date.now(),
            count: spans.length,
          });
        })
      ),
    [],
    [client, params]
  );

  React.useEffect(() => {
    setConnectionState(({ timestamp }) => ({
      kind: 'stale',
      timestamp,
    }));
  }, [params]);

  return (
    <div className="route-explore">
      <div className="pane-container">
        <SplitPane
          defaultSize={430}
          minSize={320}
          split={inspectorPosition === 'side' ? 'vertical' : 'horizontal'}
          primary="second"
        >
          <>
            <Route path="/explore/log">
              <Log spans={spans} />
            </Route>
            <Route path="/explore/timeline">
              <Timeline spans={spans} />
            </Route>
          </>
          <Inspector />
        </SplitPane>
      </div>
      <StatusBar connectionState={connectionState} />
    </div>
  );
};

export const useSelectedId = () =>
  useSearch<string>(prop('selectedId'), assoc('selectedId'));

export const useHighlightId = () =>
  useSearch<string>(prop('highlightId'), assoc('highlightId'));

export type RouteProps = {
  spans: Span[];
};
