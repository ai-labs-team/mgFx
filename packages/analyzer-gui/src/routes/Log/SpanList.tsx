import React from 'react';
import { Span } from '@mgfx/analyzer';
import { toTree, Node } from '@mgfx/analyzer/dist/utils';
import { H4, Callout, Classes, NonIdealState } from '@blueprintjs/core';
import classNames from 'classnames';
import { stateIntent, stateIcon } from '../../common';
import { useKey } from '../../hooks/useConfig';

type Props = {
  spans: Span[];
  selected?: Span;
  onSelect: (span: Span) => void;
};

type ItemProps = {
  span: Span;
  selected?: Span;
  onSelect: (span: Span) => void;
};

const Item: React.FC<ItemProps> = ({ span, selected, onSelect }) => {
  return (
    <Callout
      className={classNames('item', { selected: selected?.id === span.id })}
      intent={stateIntent(span)}
      icon={stateIcon({ span, size: 20 })}
      onClick={() => onSelect(span)}
    >
      <H4 className={Classes.MONOSPACE_TEXT}>{span.process.spec.name}</H4>
    </Callout>
  );
};

type RecursiveItemProps = ItemProps & {
  childSpans: Node[];
};

const RecursiveItem: React.FC<RecursiveItemProps> = ({
  childSpans,
  span,
  selected,
  onSelect
}) => {
  return (
    <>
      <Item span={span} selected={selected} onSelect={onSelect} />
      <div className="children">
        {...childSpans
          .sort((a, b) => a.createdAt - b.createdAt)
          .map(({ children, ...childSpan }) => (
            <RecursiveItem
              key={childSpan.id}
              span={childSpan}
              childSpans={children}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
      </div>
    </>
  );
};

export const SpanList: React.FC<Props> = ({ spans, selected, onSelect }) => {
  const displayMode = useKey('logDisplayMode');

  const items = React.useMemo(() => {
    if (displayMode === 'list') {
      return spans.map(span => (
        <Item
          key={span.id}
          span={span}
          selected={selected}
          onSelect={onSelect}
        />
      ));
    }

    return spans
      .filter(span => span.parentId === undefined)
      .map(span => toTree(spans, span.id))
      .map(({ children, ...span }) => (
        <RecursiveItem
          key={span.id}
          span={span}
          childSpans={children}
          selected={selected}
          onSelect={onSelect}
        />
      ));
  }, [spans, selected, displayMode]);

  if (!items.length) {
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
    <div className={classNames('list', { 'has-selection': !!selected })}>
      {items}
    </div>
  );
};
