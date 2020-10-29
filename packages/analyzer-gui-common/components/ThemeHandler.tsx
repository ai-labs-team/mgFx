import React from 'react';

import {useKey} from '../hooks/useConfig';

import './ThemeHandler.scss';

export const ThemeHandler: React.FC = () => {
  const [theme] = useKey('theme');

  React.useEffect(() => {
    const body = document.body;
    theme === 'dark'
      ? body.classList.add('bp3-dark')
      : body.classList.remove('bp3-dark');
  }, [theme]);

  return null;
}