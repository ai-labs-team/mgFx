import React from 'react';

import { RouteProps, useSelectedId, useHighlightId } from '../Explore';
import { SpanList } from './Log/SpanList';

import './Log.scss';

type Props = RouteProps;

export const Log: React.FC<Props> = ({ spans, isStale }) => {
  const [selectedId, setSelectedId] = useSelectedId();
  const [highlightId] = useHighlightId();

  return (
    <div className="route-log">
      <SpanList
        spans={isStale ? [] : spans}
        onSelect={setSelectedId}
        {...{ selectedId, highlightId }}
      />
    </div>
  );
};
