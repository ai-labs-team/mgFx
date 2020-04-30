import React from 'react';
import { Button, Dialog, Tooltip, Classes } from '@blueprintjs/core';
import { httpClient } from '@mgfx/analyzer-http-client';
import { fork, map } from 'fluture';

import { useRefreshing } from './Context';
import { ProcessTree } from './ProcessTree';

type Props = { accountId: number } | { userId: number } | { groupId: number };

const client = httpClient({
  baseUrl: '/bridge/mgFx',
  fetch,
  EventSource,
});

export const TraceButton: React.FC<Props> = (props) => {
  const isRefreshing = useRefreshing(props);
  const [isOpen, setIsOpen] = React.useState(false);
  const [processId, setProcessId] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (!isRefreshing || !isOpen) {
      setProcessId(undefined);
      return;
    }

    client.query
      .spans({
        scope: {
          spec: {
            name:
              'accountId' in props
                ? 'refreshAccount'
                : 'userId' in props
                ? 'refreshUserAccounts'
                : 'refreshGroupAccounts',
          },
          state: 'running',
          input: {
            eq:
              'accountId' in props
                ? props.accountId
                : 'userId' in props
                ? props.userId
                : props.groupId,
          },
        },
        limit: 1,
        order: {
          field: 'createdAt',
          direction: 'desc',
        },
      })
      .get()
      .pipe(map((spans) => spans[0].id))
      .pipe(fork(console.error)(setProcessId));
  }, [isRefreshing, isOpen, props]);

  const content = React.useMemo(() => {
    if (!processId) {
      return (
        <p>
          <b>No Refresh in progress.</b>
        </p>
      );
    }

    return (
      <>
        <p>
          <b>Process ID: {processId}</b>
        </p>
        <ProcessTree processId={processId} />
      </>
    );
  }, [processId]);

  return (
    <>
      <Tooltip content="View Progress">
        <Button icon="eye-open" onClick={() => setIsOpen(true)} />
      </Tooltip>
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="View Progress"
        style={{ width: 800, maxHeight: '80vh' }}
      >
        <div style={{ overflowY: 'scroll' }}>
          <div className={Classes.DIALOG_BODY}>{content}</div>
        </div>
      </Dialog>
    </>
  );
};
