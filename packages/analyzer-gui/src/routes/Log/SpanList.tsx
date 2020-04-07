import React from 'react';
import { Span } from '@mgfx/analyzer';
import { H4, Callout, Classes, NonIdealState } from '@blueprintjs/core';
import AutoSizer from 'react-virtualized-auto-sizer';
import classNames from 'classnames';
import { FixedSizeList } from 'react-window';

import { stateIntent, stateIcon } from '../../common';
import { Schema } from '../../config';
import { useKey } from '../../hooks/useConfig';

type Props = {
  spans: Span[];
  selectedId?: string;
  onSelect: (id: string) => void;
};

type ItemProps = {
  data: {
    layout: Layout;
    onSelect: (id: string) => void;
    selectedId: string;
  };
  index: number;
  style: React.CSSProperties;
};

const Item: React.FC<ItemProps> = ({
  data: { layout, onSelect, selectedId },
  index,
  style,
}) => {
  const [depth, span] = layout[index];

  return (
    <Callout
      style={{
        ...style,
        left: (style.left as number) + 20 * depth,
        right: 0,
        height: (style.height as number) - 1,
        width: 'auto',
      }}
      className={classNames('item', { selected: selectedId === span.id })}
      intent={stateIntent(span)}
      icon={stateIcon({ span, size: 20 })}
      onClick={() => onSelect(span.id)}
    >
      <H4 className={classNames('name', Classes.MONOSPACE_TEXT)}>
        {span.process.spec.name}
      </H4>
    </Callout>
  );
};

export const SpanList: React.FC<Props> = ({ spans, selectedId, onSelect }) => {
  const displayMode = useKey('logDisplayMode');

  const layout = React.useMemo(() => computeLayout(displayMode, spans), [
    displayMode,
    spans,
  ]);

  if (!spans.length) {
    return (
      <NonIdealState
        className="list"
        icon="help"
        title="Waiting for Processes..."
        description={
          <p>
            Your Analyzer server has not sent any Process information matching
            your criteria yet.
          </p>
        }
      />
    );
  }

  return (
    <div className={classNames('list', { 'has-selection': !!selectedId })}>
      <AutoSizer>
        {({ width, height }) => (
          <FixedSizeList
            height={height}
            width={width}
            itemCount={spans.length}
            itemSize={40}
            itemData={{ layout, onSelect, selectedId }}
          >
            {Item}
          </FixedSizeList>
        )}
      </AutoSizer>
    </div>
  );
};

type Layout = [
  number, // depth
  Span
][];

const isParentOf = (a: Span) => (b: Span) => b.id === a.parentId;
const isChildOf = (a: Span) => (b: Span) => b.parentId === a.id;

const computeTreeLayout = (spans: Span[], roots: Span[], depth = 0): Layout =>
  roots.reduce((layout, root) => {
    const children = spans.filter(isChildOf(root));

    return layout.concat(
      [[depth, root]],
      computeTreeLayout(spans, children, depth + 1)
    );
  }, []);

const computeLayout = (
  displayMode: Schema['logDisplayMode'],
  spans: Span[]
): Layout => {
  if (displayMode === 'list') {
    return spans.map((span) => [0, span]);
  }

  const roots = spans.filter(
    (span) => !span.parentId || !spans.find(isParentOf(span))
  );

  return computeTreeLayout(spans, roots);
};
