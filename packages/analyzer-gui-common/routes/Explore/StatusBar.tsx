import React from 'react';
import {
  Callout,
  Intent,
  Code,
  IconName,
  Classes,
  Icon,
} from '@blueprintjs/core';
import { pathOr } from 'ramda';

import './StatusBar.scss';

export type ConnectionState = {
  timestamp: number;
} & (
  | { kind: 'error'; error: any }
  | { kind: 'stale' }
  | { kind: 'ok'; count: number }
);

export type Props = {
  connectionState: ConnectionState;
};

const match = (
  state: ConnectionState
): { intent: Intent; icon: IconName; content: React.ReactNode } => {
  if (state.kind === 'error') {
    const { error } = state;
    const message = pathOr(JSON.stringify(error), ['message'], error);

    return {
      intent: Intent.DANGER,
      icon: 'error',
      content: (
        <>
          Unable to load Process Log:
          <Code>{message}</Code>
        </>
      ),
    };
  }

  if (state.kind === 'stale') {
    return {
      intent: Intent.NONE,
      icon: 'outdated',
      content: 'Process Log is stale; waiting for fresh data...',
    };
  }

  if (state.kind === 'ok') {
    return {
      intent: Intent.SUCCESS,
      icon: 'tick-circle',
      content: `Connection OK; fetched ${state.count} spans.`,
    };
  }
};

export const StatusBar: React.FC<Props> = ({ connectionState }) => {
  const { intent, icon, content } = match(connectionState);

  return (
    <Callout
      className="status-bar"
      intent={intent}
      icon={<Icon icon={icon} iconSize={14} />}
    >
      {content}
      <span className={`timestamp ${Classes.TEXT_MUTED}`}>
        Last Update: {new Date(connectionState.timestamp).toLocaleString()}
      </span>
    </Callout>
  );
};
