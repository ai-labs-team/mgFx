import React from 'react';
import { Span } from '@mgfx/analyzer';
import {
  Tabs,
  Tab,
  Popover,
  Button,
  Menu,
  NonIdealState
} from '@blueprintjs/core';

import { config } from '../config';
import { useKey } from '../hooks/useConfig';
import { IOTab } from './Inspector/IOTab';
import { SummaryTab } from './Inspector/SummaryTab';

import './Inspector.scss';

type Props = {
  span?: Span;
  onClose: () => void;
};

export const Inspector: React.FC<Props> = ({ span, onClose }) => {
  const inspectorPosition = useKey('inspectorPosition');

  const [selectedTab, setSelectedTab] = React.useState('io');
  const tabContent = React.useMemo(() => {
    if (!span) {
      return (
        <NonIdealState
          icon="help"
          title="No Process Selected"
          description="Select a Process to view details"
        />
      );
    }

    if (selectedTab === 'io') {
      return <IOTab span={span} />;
    }

    if (selectedTab === 'summary') {
      return <SummaryTab span={span} />;
    }
  }, [span, selectedTab, inspectorPosition]);

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
