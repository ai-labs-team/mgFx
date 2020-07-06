import React from 'react';

import { Span } from '@mgfx/analyzer';
import { NonIdealState } from '@blueprintjs/core';
import SplitPane from 'react-split-pane';
import { ObjectInspector } from 'react-inspector';

import { useKey } from 'src/hooks/useConfig';

type Props = {
  span: Span;
};

export const IOTab: React.FC<Props> = ({ span }) => {
  const inspectorPosition = useKey('inspectorPosition');
  const theme = useKey('theme') === 'light' ? 'chromeLight' : 'chromeDark';

  const output = React.useMemo(() => {
    if (span.state === 'running') {
      return (
        <NonIdealState
          icon="time"
          title="Process is still running"
          description="Output will be shown when Process has finished."
        />
      );
    }

    if (span.state === 'cancelled') {
      return (
        <NonIdealState icon="warning-sign" title="Process was cancelled" />
      );
    }

    if (span.state === 'dead') {
      const last = span.heartbeat?.last
        ? new Date(span.heartbeat.last).toLocaleString()
        : undefined;

      return (
        <NonIdealState
          icon="outdated"
          title="Process is not responding"
          description={last ? `Last heartbeat received at ${last}` : 'No heartbeat received.'}
        />
      );
    }

    return <ObjectInspector data={span.output} theme={theme} />;
  }, [span.state]);

  return (
    <SplitPane
      className="io-tab"
      split={inspectorPosition === 'side' ? 'horizontal' : 'vertical'}
      defaultSize="50%"
    >
      <ObjectInspector data={span.input} theme={theme} />
      {output}
    </SplitPane>
  );
};
