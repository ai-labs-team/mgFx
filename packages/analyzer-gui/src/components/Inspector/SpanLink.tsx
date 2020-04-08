import React from 'react';
import { Button, Tag, Classes, Spinner } from '@blueprintjs/core';
import { Span } from '@mgfx/analyzer';
import { useKefir } from 'use-kefir';
import classNames from 'classnames';

import { useAppContext } from '../../contexts/App';
import { stateIntent, stateIcon } from '../../common';
import { NavButton } from '../NavButton';

type Props = {
  id: string;
};

export const SpanLink: React.FC<Props> = ({ id }) => {
  const { client } = useAppContext();

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
    <NavButton
      minimal
      className={classNames('span-link', Classes.MONOSPACE_TEXT)}
      intent={intent}
      icon={icon}
      to={{ hash: id }}
      replace
    >
      {span ? span.process.spec.name : id}
    </NavButton>
  );
};
