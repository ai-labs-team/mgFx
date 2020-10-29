import React from 'react';

import { RouteProps, useSelectedId, useHighlightId } from '../Explore';
import { Toolbar } from './Log/Toolbar';
import { SpanList } from './Log/SpanList';

import './Log.scss';

type Props = RouteProps;

export const Log: React.FC<Props> = ({ spans }) => {
  const [selectedId, setSelectedId] = useSelectedId();
  const [highlightId] = useHighlightId();

  return (
    <div className="route-log">
      <Toolbar />
      <SpanList
        spans={spans}
        onSelect={setSelectedId}
        {...{ selectedId, highlightId }}
      />
    </div>
  );
};
