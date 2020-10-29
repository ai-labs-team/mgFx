import React from 'react';
import { Redirect } from 'react-router-dom';

import { Explore } from './routes/Explore';
import './Routes.scss';

export const Routes = () => (
  <div className="routes">
    <Explore />
    <Redirect to="/explore/log" />
  </div>
);
