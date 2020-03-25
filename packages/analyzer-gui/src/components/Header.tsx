import React from 'react';
import { Navbar, AnchorButton, Tooltip, Button } from '@blueprintjs/core';

import { NavButton } from './NavButton';
import { useAppContext } from '..//contexts/App';

export const Header: React.FC = () => {
  const { showConfig } = useAppContext();

  return (
    <Navbar>
      <Navbar.Group>
        <NavButton minimal icon="list" text="Log" to="/" />
        <Tooltip content="Not Implemented Yet">
          <AnchorButton minimal disabled icon="gantt-chart" text="Timeline" />
        </Tooltip>
      </Navbar.Group>
      <Navbar.Group align="right">
        <Button minimal icon="cog" onClick={showConfig} />
      </Navbar.Group>
    </Navbar>
  );
};
