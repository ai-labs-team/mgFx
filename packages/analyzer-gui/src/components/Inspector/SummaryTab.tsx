import React from 'react';
import { Span } from '@mgfx/analyzer';
import { titleCase } from 'title-case';
import { Tag, Classes } from '@blueprintjs/core';

import { stateIntent, stateIcon } from '../../common';
import { SpanLink } from './SpanLink';

type Props = {
  span: Span;
};

export const SummaryTab: React.FC<Props> = ({ span }) => {
  const finishedAt = React.useMemo(() => {
    if (span.state === 'running') {
      return null;
    }

    const endedAt = new Date(span.endedAt).toLocaleString();

    if (span.state === 'resolved') {
      return (
        <>
          <dt className={Classes.TEXT_MUTED}>Resolved At</dt>
          <dd>{endedAt}</dd>
        </>
      );
    }

    if (span.state === 'rejected') {
      return (
        <>
          <dt className={Classes.TEXT_MUTED}>Rejected At</dt>
          <dd>{endedAt}</dd>
        </>
      );
    }

    if (span.state === 'cancelled') {
      return (
        <>
          <dt className={Classes.TEXT_MUTED}>Cancelled At</dt>
          <dd>{endedAt}</dd>
        </>
      );
    }
  }, [span, span.state]);

  const duration = React.useMemo(() => {
    return ('endedAt' in span ? span.endedAt : Date.now()) - span.createdAt;
  }, [span, span.state]);

  const parent = React.useMemo(() => {
    if (span.parentId) {
      return (
        <>
          <dt className={Classes.TEXT_MUTED}>Parent Task</dt>
          <dd>
            <SpanLink id={span.parentId} />
          </dd>
        </>
      );
    }
  }, [span.parentId]);

  return (
    <dl className="summary-tab">
      <dt className={Classes.TEXT_MUTED}>Task Name</dt>
      <dd className={Classes.MONOSPACE_TEXT}>{span.process.spec.name}</dd>
      <dt className={Classes.TEXT_MUTED}>Process ID</dt>
      <dd className={Classes.MONOSPACE_TEXT}>{span.id}</dd>
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
      {parent}
    </dl>
  );
};
