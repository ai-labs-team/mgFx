import React from 'react';
import { Span } from '@mgfx/analyzer';
import {
  Intent,
  MaybeElement,
  Classes,
  Spinner,
  IIconProps
} from '@blueprintjs/core';

const STATE_INTENTS: Record<Span['state'], Intent> = {
  running: 'none',
  resolved: 'success',
  rejected: 'danger',
  cancelled: 'warning',
  dead: 'warning'
};

export const stateIntent = (span: Span): Intent => STATE_INTENTS[span.state];

export const stateIcon = ({ span, size }: { span: Span; size?: number }) => {
  if (span.state === 'running') {
    return (
      <span className={Classes.ICON}>
        <Spinner size={size} />
      </span>
    );
  }

  if (span.state === 'resolved') {
    return 'tick';
  }

  if (span.state === 'rejected') {
    return 'error';
  }

  if (span.state === 'cancelled') {
    return 'warning-sign';
  }

  if (span.state === 'dead') {
    return 'outdated';
  }

  return undefined;
};
