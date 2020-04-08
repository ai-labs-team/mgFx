import React from 'react';
import { Span } from '@mgfx/analyzer';
import { H4, Callout, Classes, NonIdealState } from '@blueprintjs/core';
import AutoSizer from 'react-virtualized-auto-sizer';
import classNames from 'classnames';
import { FixedSizeList } from 'react-window';

import { stateIntent, stateIcon } from '../../common';
import { Schema } from '../../config';
import { useKey } from '../../hooks/useConfig';
import { useLocation } from 'react-router-dom';

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
    highlightId?: string;
  };
  index: number;
  style: React.CSSProperties;
};

const Item: React.FC<ItemProps> = ({
  data: { layout, onSelect, selectedId, highlightId },
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
      className={classNames('item', {
        selected: selectedId === span.id,
        highlight: highlightId === span.id,
      })}
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
  const location = useLocation();
  const [highlightId, setHighlightId] = React.useState<string>();
  const [pinnedId, setPinnedId] = React.useState<string>();

  const layout = React.useMemo(() => computeLayout(displayMode, spans), [
    displayMode,
    spans,
  ]);

  const scrollToId = React.useCallback(
    (id?: string) => {
      if (!id) {
        return;
      }

      const index = spans.findIndex((span) => span.id === id);
      if (index < 0) {
        return;
      }

      list.current.scrollToItem(index, 'smart');
    },
    [spans]
  );

  React.useEffect(() => {
    const id = location.hash.replace('#', '');
    if (!id) {
      return;
    }

    setPinnedId(id);
    setHighlightId(id);
    scrollToId(id);

    const timeout = setTimeout(() => {
      setHighlightId(undefined);
    }, 3000);

    return () => {
      clearTimeout(timeout);
    };
  }, [location]);

  React.useEffect(() => {
    setHighlightId(undefined);
    setPinnedId(selectedId);
  }, [selectedId]);

  React.useEffect(() => {
    if (pinnedId) {
      scrollToId(pinnedId);
    }
  }, [spans]);

  const list = React.useRef<FixedSizeList>();

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
            itemData={{ layout, onSelect, selectedId, highlightId }}
            ref={list}
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
