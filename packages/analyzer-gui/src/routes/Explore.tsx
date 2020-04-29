import React from 'react';

import { Span } from '@mgfx/analyzer';
import { tap, prop, assoc } from 'ramda';
import SplitPane from 'react-split-pane';
import { Route, Switch } from 'react-router-dom';
import { useKefir } from 'use-kefir';

import { useAppContext } from 'src/contexts/App';
import { useKey } from 'src/hooks/useConfig';

import { Log } from './Explore/Log';
import { Toolbar as LogToolbar } from './Explore/Log/Toolbar';

import { Timeline } from './Explore/Timeline';
import { Toolbar as TimelineToolbar } from './Explore/Timeline/Toolbar';

import { Inspector } from './Explore/Inspector';
import { ErrorBar } from './Explore/ErrorBar';

import './Explore.scss';
import { useSearch } from 'src/hooks/useSearch';

export const Explore: React.FC = () => {
  const [error, setError] = React.useState<any>();
  const [isStale, setIsStale] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | undefined>();

  const { client } = useAppContext();

  const inspectorPosition = useKey('inspectorPosition');
  const params = useKey('logParameters');

  React.useEffect(() => {
    setIsStale(true);
  }, [params]);

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
          setError(error);
        })
      )
      .map(
        tap((spans) => {
          setIsStale(false);
          setError(undefined);
        })
      ),
    [],
    [client, params]
  );

  return (
    <div className="route-explore">
      <SplitPane
        defaultSize="60%"
        split={inspectorPosition === 'side' ? 'vertical' : 'horizontal'}
      >
        <div className="route-explore-content">
          <Switch>
            <Route
              path="/log"
              render={() => (
                <>
                  <LogToolbar />
                  <ErrorBar error={error} />
                  <Log {...{ spans, isStale }} />
                </>
              )}
            />
            <Route
              path="/timeline"
              render={() => (
                <>
                  <TimelineToolbar />
                  <ErrorBar error={error} />
                  <Timeline {...{ spans, isStale }} />
                </>
              )}
            />
          </Switch>
        </div>
        <Inspector />
      </SplitPane>
    </div>
  );
};

const MAX_UPDATE_RATE = 4;
const UPDATE_THROTTLE_PERIOD = Math.floor(1000 / MAX_UPDATE_RATE);

const _getSelectedId = prop('selectedId');
const _setSelectedId = assoc('selectedId');

const _getHighlightId = prop('highlightId');
const _setHighlightId = assoc('highlightId');

export const useSelectedId = () =>
  useSearch<string>(_getSelectedId, _setSelectedId);

export const useHighlightId = () =>
  useSearch<string>(_getHighlightId, _setHighlightId);

export type RouteProps = {
  spans: Span[];
  isStale: boolean;
};
