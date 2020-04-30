import React from 'react';
import { Card, H5 } from '@blueprintjs/core';
import useFetch from 'use-http';
// @ts-ignore
import Timestamp from 'react-timestamp';

import { RefreshButton } from './RefreshButton';
import { useRefreshing } from './Context';

export type TAccount = {
  id: number;
  label: string;
  institution: string;
  institution_reference: string;
  balance: number | null;
  last_refreshed: number | null;
};

type Props = {
  account: TAccount;
};

export const Account: React.FC<Props> = (props) => {
  const [account, setAccount] = React.useState(props.account);
  const [wasRefreshing, setWasRefreshing] = React.useState(false);
  const isRefreshing = useRefreshing({ accountId: account.id });

  const { request } = useFetch<TAccount>(`/core/accounts/${account.id}`);

  React.useEffect(() => {
    setWasRefreshing(isRefreshing);
  }, [isRefreshing]);

  React.useEffect(() => {
    if (!isRefreshing && wasRefreshing) {
      request.get().then((account) => setAccount(account));
    }
  }, [isRefreshing, wasRefreshing, request]);

  return (
    <Card>
      <H5>
        Account {account.id}: {account.label}
      </H5>
      <p>
        <b>Balance: {account.balance?.toLocaleString() ?? 'Unknown'}</b>
      </p>
      <p>Institution: {account.institution}</p>
      <p>Reference: {account.institution_reference}</p>
      <p>
        Last Refreshed:
        {account.last_refreshed ? (
          <Timestamp date={Math.floor(account.last_refreshed / 1000)} />
        ) : (
          'Never'
        )}
      </p>
      <RefreshButton accountId={account.id} />
    </Card>
  );
};
