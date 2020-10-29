import React from 'react';
import { Navbar, Button, Tooltip } from '@blueprintjs/core';

import { NavButton } from './NavButton';
import { ConfigDialog } from './ConfigDialog';

export const Header: React.FC = ({ children }) => {
  const [configIsOpen, setShowConfigDialog] = React.useState(false);
  const showConfig = React.useCallback(() => setShowConfigDialog(true), []);
  const hideConfig = React.useCallback(() => setShowConfigDialog(false), []);

  return (
    <>
      <Navbar>
        <Navbar.Group>
          <NavButton
            exact
            minimal
            icon="list"
            text="Log"
            to="/explore/log"
            replace={false}
          />
          <NavButton
            minimal
            exact
            replace={false}
            icon="gantt-chart"
            text="Timeline"
            to="/explore/timeline"
          />
        </Navbar.Group>
        <Navbar.Group align="right">
          {children}
          <Tooltip content="Configuration">
          <Button minimal icon="cog" onClick={showConfig} />
          </Tooltip>
        </Navbar.Group>
      </Navbar>
      <ConfigDialog isOpen={configIsOpen} onClose={hideConfig} />
    </>
  );
};
