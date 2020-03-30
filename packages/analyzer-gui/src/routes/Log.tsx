import React from 'react';
import { useKefir } from 'use-kefir';
import SplitPane from 'react-split-pane';
import { tap } from 'ramda';

import { useKey } from '../hooks/useConfig';
import { useAppContext } from '../contexts/App';
import { Inspector } from '../components/Inspector';

import { Toolbar } from './Log/Toolbar';
import { ErrorBar } from './Log/ErrorBar';
import { SpanList } from './Log/SpanList';

import './Log.scss';

// 'ideal' maximum number of updates per second, used to calculate observer throttling period
const TARGET_UPS = 4;

export const Log: React.FC = () => {
  const inspectorPosition = useKey('inspectorPosition');
  const { client } = useAppContext();
  const [selectedId, setSelectedId] = React.useState<string | undefined>();
  const [error, setError] = React.useState<any>();
  const [isStale, setIsStale] = React.useState(true);

  const params = useKey('logParameters');

  React.useEffect(() => {
    setIsStale(true);
  }, [params]);

  const spans = useKefir(
    client.query
      .spans({
        ...params,
        compact: true
      })
      .watch()
      .throttle(Math.floor(1000 / TARGET_UPS))
      .mapErrors(
        tap(error => {
          setError(error);
        })
      )
      .map(
        tap(spans => {
          setIsStale(false);
          setError(undefined);
        })
      ),
    [],
    [client, params]
  );

  return (
    <div className="log">
      <SplitPane
        defaultSize="60%"
        split={inspectorPosition === 'side' ? 'vertical' : 'horizontal'}
      >
        <div className="spans">
          <Toolbar />
          <ErrorBar error={error} />
          <SpanList
            spans={isStale ? [] : spans}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <Inspector span={selectedId} onClose={() => setSelectedId(undefined)} />
      </SplitPane>
    </div>
  );
};
