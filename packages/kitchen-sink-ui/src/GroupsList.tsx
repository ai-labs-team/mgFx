import React from 'react';
import useFetch from 'use-http';
import { H2 } from '@blueprintjs/core';

import { GroupUsersList } from './GroupUsersList';
import { RefreshButton } from './RefreshButton';

type Group = {
  id: number;
  name: string;
};

export const GroupsList: React.FC = () => {
  const { loading, error, data } = useFetch<Group[]>('/core/groups', {}, []);
  if (loading) {
    return <p>Loading Groups...</p>;
  }

  if (error) {
    return (
      <>
        <p>Failed to load Groups:</p>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </>
    );
  }

  return (
    <>
      {data!.map(group => (
        <div className="group" key={group.id}>
          <H2>
            Group {group.id}: {group.name}
          </H2>
          <RefreshButton groupId={group.id} />
          <GroupUsersList id={group.id} />
        </div>
      ))}
    </>
  );
};
