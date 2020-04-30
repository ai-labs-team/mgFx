import React from 'react';
import { Callout, Spinner, Classes } from '@blueprintjs/core';
import { Span } from '@mgfx/analyzer/dist/query';
import { httpClient } from '@mgfx/analyzer-http-client';
import { useKefir } from 'use-kefir';

type Node = {
  name: string;
  state: Span['state'];
  input: any;
  children: Node[];
};

const client = httpClient({ baseUrl: '/bridge/mgFx', fetch, EventSource });

const spanToNodes = (spans: Span[], rootId: string): Node => {
  const root = spans.find((span) => span.id === rootId);
  if (!root) {
    throw new Error(`Unable to find root node ${rootId}`);
  }

  return {
    name: root.process.spec.name,
    state: root.state,
    input: root.input,
    children: spans
      .filter((span) => span.parentId === rootId)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((span) => spanToNodes(spans, span.id)),
  };
};

const ProcessNode: React.FC<{ node: Node }> = ({ node }) => {
  const [intent, icon] =
    node.state === 'running'
      ? [
          'primary' as const,
          <div className={Classes.ICON}>
            <Spinner intent="primary" size={Spinner.SIZE_SMALL} />
          </div>,
        ]
      : node.state === 'resolved'
      ? ['success' as const, 'tick' as const]
      : node.state === 'rejected'
      ? ['danger' as const, 'cross' as const]
      : ['none' as const, 'ban-circle' as const];

  return (
    <>
      <Callout intent={intent} icon={icon} style={{ marginBottom: 2 }}>
        <pre style={{ margin: 0, fontSize: 13 }}>
          {node.name}({JSON.stringify(node.input, null, 2)})
        </pre>
      </Callout>
      <div style={{ marginLeft: 20 }}>
        {node.children.map((node, index) => (
          <ProcessNode key={index} node={node} />
        ))}
      </div>
    </>
  );
};
export const ProcessTree: React.FC<{ processId: string }> = ({ processId }) => {
  const node = useKefir(
    client.query
      .spans({ scope: { id: processId } })
      .watch()
      .map((spans) => spanToNodes(spans, processId)),
    { name: '_unknown', state: 'running', input: undefined, children: [] },
    []
  );

  return <ProcessNode node={node} />;
};
