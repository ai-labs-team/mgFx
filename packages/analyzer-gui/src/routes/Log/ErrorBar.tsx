import React from 'react';
import { Code, Classes, Callout } from '@blueprintjs/core';
import { pathOr } from 'ramda';

type Props = {
  error: any;
};

export const ErrorBar: React.FC<Props> = ({ error }) => {
  if (!error) {
    return null;
  }

  const message = pathOr(JSON.stringify(error), ['message'], error);

  return (
    <Callout className="error-bar" intent="danger">
      <p>Unable to load Process log:</p>
      <Code>{message}</Code>
    </Callout>
  );
};
