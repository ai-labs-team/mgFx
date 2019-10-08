import React from 'react';
import { BrowserRouter as Router, Redirect, Route } from 'react-router-dom';
import SplitPane from 'react-split-pane';

import { Timeline } from '@components/Timeline';
import { Panel } from '@components/Panel';

import './Inspector.scss';

export type Params = Partial<{
  span: string;
  selectedId: string;
  panel: string;
}>;

export const Inspector: React.FunctionComponent = () => {
  const defaultSize = React.useMemo(() => window.innerHeight, []);

  return (
    <Router>
      <Route path='/timeline/:span?/:selectedId?/:panel?'>
        <SplitPane
          split='horizontal'
          maxSize={-200}
          minSize={200}
          defaultSize={defaultSize - 200}>
          <Timeline />
          <Panel />
        </SplitPane>
      </Route>
      <Route path='/'>
        <Redirect to='/timeline' />
      </Route>
    </Router>
  );
}
