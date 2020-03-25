import React from 'react';
import { Span } from '@mgfx/analyzer';
import SplitPane from 'react-split-pane';
import { ObjectInspector } from 'react-inspector';

import { useKey } from '../../hooks/useConfig';

type Props = {
  span: Span;
};

export const IOTab: React.FC<Props> = ({ span }) => {
  const inspectorPosition = useKey('inspectorPosition');
  const theme = useKey('theme') === 'light' ? 'chromeLight' : 'chromeDark';

  const output =
    span.state === 'resolved'
      ? span.value
      : span.state === 'rejected'
      ? span.reason
      : undefined;

  return (
    <SplitPane
      className="io-tab"
      split={inspectorPosition === 'side' ? 'horizontal' : 'vertical'}
      defaultSize="50%"
    >
      <ObjectInspector data={span.input} theme={theme} />
      <ObjectInspector data={output} theme={theme} />
    </SplitPane>
  );
};
