import React from 'react';
import { Span } from '@mgfx/analyzer';
import { H4, Callout, Classes, NonIdealState } from '@blueprintjs/core';
import AutoSizer from 'react-virtualized-auto-sizer';
import classNames from 'classnames';
import { FixedSizeList, ListChildComponentProps } from 'react-window';

import { rootsAndOrphansIn, childrenOf } from '../../../utils';
import { stateIntent, stateIcon } from '../../../common';
import { Config } from '../../../config';
import { useKey } from '../../../hooks/useConfig';

type Props = {
  spans: Span[];
  selectedId?: string;
  onSelect: (id: string) => void;
  highlightId?: string;
};

type ItemProps = ListChildComponentProps & {
  data: {
    layout: Layout;
    onSelect: (id: string) => void;
    selectedId: string;
    highlightId?: string;
  };
};

const Item: React.FC<ItemProps> = ({
  data: { layout, onSelect, selectedId, highlightId },
  index,
  style,
}) => {
  const [depth, span] = layout[index];

  const onClick = React.useCallback<React.MouseEventHandler>(
    (event) => {
      event.stopPropagation();
      onSelect(selectedId !== span.id ? span.id : undefined);
    },
    [selectedId, span.id]
  );

  return (
    <div
      className={classNames('item', {
        selected: selectedId === span.id,
        highlight: highlightId === span.id,
      })}
      style={{
        ...style,
        left: (style.left as number) + 20 * depth,
        right: 0,
        width: 'auto',
      }}
      onClick={onClick}
    >
      <Callout intent={stateIntent(span)} icon={stateIcon({ span, size: 20 })}>
        <H4 className={classNames('name', Classes.MONOSPACE_TEXT)}>
          {span.process.spec.name}
        </H4>
      </Callout>
    </div>
  );
};

export const SpanList: React.FC<Props> = ({
  spans,
  selectedId,
  onSelect,
  highlightId,
}) => {
  const [displayMode] = useKey('logDisplayMode');

  const layout = React.useMemo(() => computeLayout(displayMode, spans), [
    displayMode,
    spans,
  ]);

  const [visibleHighlightId, setVisibleHighlightId] = React.useState(
    highlightId
  );

  React.useEffect(() => {
    setVisibleHighlightId(highlightId);

    const timeout = setTimeout(() => {
      setVisibleHighlightId(undefined);
    }, 3000);

    return () => {
      clearTimeout(timeout);
    };
  }, [highlightId]);

  React.useEffect(() => {
    setVisibleHighlightId(undefined);
  }, [selectedId]);

  const onListClicked = React.useCallback(() => {
    onSelect(undefined);
  }, []);

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
    <div
      className={classNames('list', { 'has-selection': !!selectedId })}
      onClick={onListClicked}
    >
      <AutoSizer>
        {({ width, height }) => (
          <FixedSizeList
            height={height}
            width={width}
            itemCount={spans.length}
            itemSize={40}
            itemData={{
              layout,
              onSelect,
              selectedId,
              highlightId: visibleHighlightId,
            }}
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

const computeTreeLayout = (spans: Span[], roots: Span[], depth = 0): Layout =>
  roots.reduce((layout, root) => {
    const children = childrenOf(root, spans);

    return layout.concat(
      [[depth, root]],
      computeTreeLayout(spans, children, depth + 1)
    );
  }, []);

const computeLayout = (
  displayMode: Config['logDisplayMode'],
  spans: Span[]
): Layout => {
  if (displayMode === 'list') {
    return spans.map((span) => [0, span]);
  }

  const roots = rootsAndOrphansIn(spans);
  return computeTreeLayout(spans, roots);
};
