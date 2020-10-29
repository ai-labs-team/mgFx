import React from 'react';
import { Button, Popover, Menu } from '@blueprintjs/core';

import { useKey } from '../../../hooks/useConfig';

import { LimitDialog } from './Toolbar/LimitDialog';

export const Toolbar: React.FC = () => {
  const [displayMode, setDisplayMode] = useKey('logDisplayMode');
  const [params] = useKey('logParameters');
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
              onClick={() => setDisplayMode('list')}
            />
            <Menu.Item
              text="Tree"
              icon="diagram-tree"
              active={displayMode === 'tree'}
              onClick={() => setDisplayMode('tree')}
            />
          </Menu>
        }
      >
        <Button minimal small icon="more" />
      </Popover>
    </div>
  );
};
