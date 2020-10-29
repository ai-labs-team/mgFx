import React from 'react';
import { pipe, prop, assoc } from 'ramda';

import { useSearch } from '../../hooks/useSearch';
import { RouteProps, useSelectedId } from '../Explore';

import { Graph, TimeDomain } from './Timeline/Graph';
import { Toolbar } from './Timeline/Toolbar';

import './Timeline.scss';

type Props = RouteProps;

export const Timeline: React.FC<Props> = ({ spans }) => {
  const [following] = useFollowing();
  const [selectedId, setSelectedId] = useSelectedId();

  const [[start, end], setCurrentTimeDomain] = React.useState<TimeDomain>([
    0,
    0,
  ]);

  return (
    <div className="timeline">
      <Toolbar />
      <Graph
        spans={spans}
        initialFocus={{ kind: 'now', following }}
        onTimeDomainChanged={setCurrentTimeDomain}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
    </div>
  );
};

const _getFollowing = pipe(prop('following'), (str) =>
  str === 'true' ? true : false
);

const _setFollowing = assoc('following');

export const useFollowing = () =>
  useSearch<boolean>(_getFollowing, _setFollowing);
