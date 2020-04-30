import React from 'react';
import useFetch from 'use-http';
import { H3 } from '@blueprintjs/core';

import { UserAccountsList } from './UserAccountsList';
import { RefreshButton } from './RefreshButton';

import './GroupUsersList.scss';

type Props = {
  id: number;
};

type Membership = {
  group_id: number;
  user_id: number;
  role: 'user' | 'manager';
  user: {
    id: number;
    name: string;
  };
};

export const GroupUsersList: React.FC<Props> = ({ id }) => {
  const { loading, error, data } = useFetch<Membership[]>(
    `/core/group_memberships?group_id=${id}&role=user&_expand=user`,
    {},
    []
  );

  if (loading) {
    return <p>Loading Users...</p>;
  }

  if (error) {
    return (
      <>
        <p>Failed to load Users:</p>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </>
    );
  }

  return (
    <>
      {data!.map(({ user }) => (
        <div className="user" key={user.id}>
          <H3>
            User {user.id}: {user.name}
          </H3>
          <RefreshButton userId={user.id} />
          <UserAccountsList id={user.id} />
        </div>
      ))}
    </>
  );
};
