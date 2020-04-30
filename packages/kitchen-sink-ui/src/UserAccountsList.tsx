import React from 'react';
import useFetch from 'use-http';

import { Account, TAccount } from './Account';

type Props = {
  id: number;
};

export const UserAccountsList: React.FC<Props> = ({ id }) => {
  const { loading, error, data } = useFetch<TAccount[]>(
    `/core/accounts?user_id=${id}`,
    {},
    []
  );

  if (loading) {
    return <p>Loading Accounts...</p>;
  }

  if (error) {
    return (
      <>
        <p>Failed to load Accounts:</p>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </>
    );
  }

  if (data!.length === 0) {
    return (
      <div className="account empty">
        <em>This User has no Accounts.</em>
      </div>
    );
  }

  return (
    <>
      {data!.map(account => (
        <Account account={account} key={account.id} />
      ))}
    </>
  );
};
