import React from 'react';
import { Span } from '@mgfx/analyzer';
import { titleCase } from 'title-case';
import { Tag, Classes } from '@blueprintjs/core';

import { stateIntent, stateIcon } from '../../common';

type Props = {
  span: Span;
};

export const SummaryTab: React.FC<Props> = ({ span }) => {
  const finishedAt = React.useMemo(() => {
    if (span.state === 'running') {
      return null;
    }

    if (span.state === 'resolved') {
      return (
        <>
          <dt className={Classes.TEXT_MUTED}>Resolved At</dt>
          <dd>{new Date(span.resolvedAt).toLocaleString()}</dd>
        </>
      );
    }

    if (span.state === 'rejected') {
      return (
        <>
          <dt className={Classes.TEXT_MUTED}>Rejected At</dt>
          <dd>{new Date(span.rejectedAt).toLocaleString()}</dd>
        </>
      );
    }

    if (span.state === 'cancelled') {
      return (
        <>
          <dt className={Classes.TEXT_MUTED}>Cancelled At</dt>
          <dd>{new Date(span.cancelledAt).toLocaleString()}</dd>
        </>
      );
    }
  }, [span, span.state]);

  const duration = React.useMemo(() => {
    const finish =
      span.state === 'resolved'
        ? span.resolvedAt
        : span.state === 'rejected'
        ? span.rejectedAt
        : span.state === 'cancelled'
        ? span.cancelledAt
        : Date.now();

    return finish - span.createdAt;
  }, [span, span.state]);

  return (
    <dl className="summary-tab">
      <dt className={Classes.TEXT_MUTED}>Task Name</dt>
      <dd className={Classes.MONOSPACE_TEXT}>{span.process.spec.name}</dd>
      <dt className={Classes.TEXT_MUTED}>Started At</dt>
      <dd>{new Date(span.createdAt).toLocaleString()}</dd>
      <dt className={Classes.TEXT_MUTED}>State</dt>
      <dd>
        <Tag
          large
          minimal
          intent={stateIntent(span)}
          icon={stateIcon({ span, size: 16 })}
        >
          {titleCase(span.state)}
        </Tag>
      </dd>
      {finishedAt}
      <dt className={Classes.TEXT_MUTED}>Duration</dt>
      <dd>{duration.toLocaleString()} ms</dd>
    </dl>
  );
};
