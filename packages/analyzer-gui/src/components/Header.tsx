import React from 'react';
import { Navbar, Button } from '@blueprintjs/core';

import { useAppContext } from 'src/contexts/App';

import { NavButton } from './NavButton';

export const Header: React.FC = () => {
  const { showConfig } = useAppContext();

  return (
    <Navbar>
      <Navbar.Group>
        <NavButton exact minimal icon="list" text="Log" to="/log" />
        <NavButton
          minimal
          exact
          icon="gantt-chart"
          text="Timeline"
          to="/timeline"
        />
      </Navbar.Group>
      <Navbar.Group align="right">
        <Button minimal icon="cog" onClick={showConfig} />
      </Navbar.Group>
    </Navbar>
  );
};
