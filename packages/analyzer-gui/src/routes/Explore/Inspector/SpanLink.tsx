import React from 'react';
import { Button, Classes, Spinner, Tooltip, Position } from '@blueprintjs/core';
import { Span } from '@mgfx/analyzer';
import { useKefir } from 'use-kefir';
import classNames from 'classnames';

import { useAppContext } from 'src/contexts/App';
import { stateIntent, stateIcon } from 'src/common';
import { useHighlightId, useSelectedId } from 'src/routes/Explore';

type Props = {
  id: string;
};

export const SpanLink: React.FC<Props> = ({ id }) => {
  const { client } = useAppContext();
  const [, setHighlightId] = useHighlightId();
  const [, setSelectedId] = useSelectedId();

  const span = useKefir<Span | undefined>(
    client.query
      .spans({ scope: { id }, limit: 1 })
      .watch()
      .map((spans) => spans[0]),
    undefined,
    [id]
  );

  const intent = React.useMemo(() => (span ? stateIntent(span) : 'none'), [
    span,
  ]);

  const icon = React.useMemo(
    () =>
      span ? (
        stateIcon({ span, size: 16 })
      ) : (
        <span className={Classes.ICON}>
          <Spinner size={16} />
        </span>
      ),
    [span]
  );

  return (
    <Tooltip
      position={Position.BOTTOM_LEFT}
      content={
        <>
          <b>Click:</b> Highlight Process
          <br />
          <b>Double-click:</b> Select Process
        </>
      }
    >
      <Button
        minimal
        className={classNames('span-link', Classes.MONOSPACE_TEXT)}
        intent={intent}
        icon={icon}
        onClick={() => setHighlightId(id)}
        onDoubleClick={() => setSelectedId(id)}
      >
        {span ? span.process.spec.name : id}
      </Button>
    </Tooltip>
  );
};
