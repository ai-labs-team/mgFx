import React from 'react';
import { H1 } from '@blueprintjs/core';
import '@blueprintjs/core/lib/css/blueprint.css';

import { DefaultProvder } from './Context';
import { GroupsList } from './GroupsList';

export const App: React.FC = () => {
  return (
    <DefaultProvder>
      <H1>mgFx Kitchen Sink</H1>
      <GroupsList />
    </DefaultProvder>
  );
};
