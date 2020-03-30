import React from 'react';
import { Span } from '@mgfx/analyzer';
import {
  Code,
  Pre,
  Tabs,
  Tab,
  Popover,
  Button,
  Menu,
  NonIdealState
} from '@blueprintjs/core';
import { useKefir } from 'use-kefir';

import { config } from '../config';
import { useAppContext } from '../contexts/App';
import { useKey } from '../hooks/useConfig';
import { IOTab } from './Inspector/IOTab';
import { SummaryTab } from './Inspector/SummaryTab';

import './Inspector.scss';

type Props = {
  span?: string;
  onClose: () => void;
};

export const Inspector: React.FC<Props> = ({ span, onClose }) => {
  const inspectorPosition = useKey('inspectorPosition');
  const { client } = useAppContext();

  const [selectedTab, setSelectedTab] = React.useState('io');
  const [isStale, setIsStale] = React.useState(true);
  const [error, setError] = React.useState<any>();

  const selectedSpan = useKefir<Span | undefined>(
    client.query
      .spans({ scope: { id: span }, limit: 1 })
      .watch()
      .withHandler<Span, Span[]>((emitter, event) => {
        if (event.type === 'error') {
          setError(event.value);
          return;
        }

        if (event.type === 'end') {
          return;
        }

        const [span] = event.value;
        emitter.emit(span);
        setError(undefined);
        setIsStale(false);

        if (span.state !== 'running') {
          emitter.end();
        }
      }),
    undefined,
    [span]
  );

  const tabContent = React.useMemo(() => {
    if (!selectedSpan) {
      return (
        <NonIdealState
          icon="help"
          title="No Process Selected"
          description="Select a Process to view details"
        />
      );
    }

    if (isStale) {
      return (
        <NonIdealState
          icon="time"
          title="Loading Process"
          description={
            <span>
              Loading Process ID <Code>{span}</Code>...
            </span>
          }
        />
      );
    }

    if (error) {
      return (
        <NonIdealState
          icon="error"
          title="Failed to load Process"
          description={
            <>
              <Code>{error.name}</Code>
              <Pre>{error.message}</Pre>
            </>
          }
        />
      );
    }

    if (selectedTab === 'io') {
      return <IOTab span={selectedSpan} />;
    }

    if (selectedTab === 'summary') {
      return <SummaryTab span={selectedSpan} />;
    }
  }, [selectedTab, selectedSpan, isStale, error, inspectorPosition]);

  React.useEffect(() => {
    setIsStale(true);
  }, [span]);

  return (
    <div className="inspector">
      <Tabs
        selectedTabId={selectedTab}
        onChange={id => setSelectedTab(id as string)}
      >
        <Tab id="io" title="Input/Output" />
        <Tab id="summary" title="Summary" />
        <Tab id="context" title="Context" />
        <Tabs.Expander />
        <Popover
          className="options"
          content={
            <Menu>
              <Menu.Divider title="Dock Position" />
              <Menu.Item
                text="Right"
                icon="add-column-right"
                active={inspectorPosition === 'side'}
                onClick={() => config.set('inspectorPosition', 'side')}
              />
              <Menu.Item
                text="Bottom"
                icon="add-row-bottom"
                active={inspectorPosition === 'bottom'}
                onClick={() => config.set('inspectorPosition', 'bottom')}
              />
            </Menu>
          }
        >
          <Button minimal small icon="more" />
        </Popover>
      </Tabs>
      {tabContent}
    </div>
  );
};
