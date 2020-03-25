import React from 'react';
import { SpanParameters } from '@mgfx/analyzer';
import { Button, Popover, Menu } from '@blueprintjs/core';

import { useKey } from '../../hooks/useConfig';
import { config } from '../../config';

import { LimitDialog } from './Toolbar/LimitDialog';

export const Toolbar: React.FC = () => {
  const displayMode = useKey('logDisplayMode');
  const params = useKey('logParameters');
  const [showLimitDialog, setShowLimitDialog] = React.useState(false);

  return (
    <div className="toolbar">
      <LimitDialog
        isOpen={showLimitDialog}
        onClose={() => setShowLimitDialog(false)}
      />
      <Button
        minimal
        small
        rightIcon="edit"
        text={`Limit: ${
          params.limit === undefined
            ? 'Infinite'
            : params.limit.toLocaleString()
        }`}
        onClick={() => setShowLimitDialog(true)}
      />
      <Popover
        className="options"
        content={
          <Menu>
            <Menu.Divider title="Display Mode" />
            <Menu.Item
              text="List"
              icon="list"
              active={displayMode === 'list'}
              onClick={() => config.set('logDisplayMode', 'list')}
            />
            <Menu.Item
              text="Tree"
              icon="diagram-tree"
              active={displayMode === 'tree'}
              onClick={() => config.set('logDisplayMode', 'tree')}
            />
          </Menu>
        }
      >
        <Button minimal small icon="more" />
      </Popover>
    </div>
  );
};
