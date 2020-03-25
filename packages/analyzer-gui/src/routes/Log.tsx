import React from 'react';
import { useKefir } from 'use-kefir';
import { Span, SpanParameters } from '@mgfx/analyzer';
import SplitPane from 'react-split-pane';
import { tap } from 'ramda';

import { useKey } from '../hooks/useConfig';
import { useAppContext } from '../contexts/App';
import { Inspector } from '../components/Inspector';

import { Toolbar } from './Log/Toolbar';
import { ErrorBar } from './Log/ErrorBar';
import { SpanList } from './Log/SpanList';

import './Log.scss';

export const Log: React.FC = () => {
  const inspectorPosition = useKey('inspectorPosition');
  const { client } = useAppContext();
  const [selectedSpan, setSelectedSpan] = React.useState<Span | undefined>();
  const [error, setError] = React.useState<any>();
  const [isStale, setIsStale] = React.useState(true);

  const params = useKey('logParameters');

  React.useEffect(() => {
    setIsStale(true);
  }, [params]);

  const spans = useKefir(
    client.query
      .spans(params)
      .watch()
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

  React.useEffect(() => {
    if (selectedSpan) {
      const match = spans.find(span => span.id === selectedSpan.id);
      if (match) {
        setSelectedSpan(match);
      }
    }
  }, [spans]);

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
            selected={selectedSpan}
            onSelect={setSelectedSpan}
          />
        </div>
        <Inspector
          span={selectedSpan}
          onClose={() => setSelectedSpan(undefined)}
        />
      </SplitPane>
    </div>
  );
};
