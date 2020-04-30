import React from 'react';
import { httpClient } from '@mgfx/analyzer-http-client';
import { combine, Stream } from 'kefir';
import { useKefir } from 'use-kefir';

const client = httpClient({ baseUrl: '/bridge/mgFx', fetch, EventSource });

export type State = {
  accountIds: number[];
  userIds: number[];
  groupIds: number[];
};

export const Context = React.createContext<Stream<State, any>>(
  undefined as any
);

export const DefaultProvder: React.FC = ({ children }) => {
  const accountIds = React.useMemo(
    () =>
      client.query
        .spans({
          scope: {
            spec: {
              name: 'refreshAccount',
            },
            state: 'running',
          },
        })
        .watch()
        .map((spans) => spans.map((span) => span.input as number)),
    []
  );

  const userIds = React.useMemo(
    () =>
      client.query
        .spans({
          scope: {
            spec: {
              name: 'refreshUserAccounts',
            },
            state: 'running',
          },
        })
        .watch()
        .map((spans) => spans.map((span) => span.input as number)),
    []
  );

  const groupIds = React.useMemo(
    () =>
      client.query
        .spans({
          scope: {
            spec: {
              name: 'refreshGroupAccounts',
            },
            state: 'running',
          },
        })
        .watch()
        .map((spans) => spans.map((span) => span.input as number)),
    []
  );

  const obs = React.useMemo(() => combine({ accountIds, userIds, groupIds }), [
    accountIds,
    userIds,
    groupIds,
  ]);

  return <Context.Provider value={obs}>{children}</Context.Provider>;
};

type UseRefreshingOptions =
  | { accountId: number }
  | { userId: number }
  | { groupId: number };

export const useRefreshing = (options: UseRefreshingOptions) => {
  const stream = React.useContext(Context);

  const state = React.useMemo(
    () =>
      stream
        .map<[number, number[]]>((state) =>
          'accountId' in options
            ? [options.accountId, state.accountIds]
            : 'userId' in options
            ? [options.userId, state.userIds]
            : [options.groupId, state.groupIds]
        )
        .map(([needle, haystack]) => haystack.includes(needle)),
    [stream, options]
  );

  return useKefir(state, false, []);
};
