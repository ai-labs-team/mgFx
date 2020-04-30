import React from 'react';
import useFetch from 'use-http';
import { Button, ButtonGroup } from '@blueprintjs/core';

import { useRefreshing } from './Context';
import { TraceButton } from './TraceButton';

type Props = { accountId: number } | { userId: number } | { groupId: number };

export const RefreshButton: React.FC<Props> = props => {
  const [request] = useFetch('/bridge/accounts/refresh', {
    cachePolicy: 'no-cache' as any
  });

  const onClick = () => request.post(props);

  const label =
    'accountId' in props
      ? 'Refresh Account'
      : 'userId' in props
      ? `Refresh User's Accounts`
      : `Refresh Member's Accounts`;

  const isRefreshing = useRefreshing(props);

  return (
    <ButtonGroup>
      <Button
        onClick={onClick}
        text={label}
        icon="refresh"
        loading={isRefreshing}
      />
      <TraceButton {...props} />
    </ButtonGroup>
  );
};
