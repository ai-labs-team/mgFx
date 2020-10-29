import React from 'react';
import { Alert, Code } from '@blueprintjs/core';

import { Server } from '../config';

type Props = {
  server?: Server;
  onCancel: () => void;
  onDelete: () => void;
};

export const DeleteConfirmation: React.FC<Props> = ({
  server: pending,
  onCancel,
  onDelete,
}) => {
  return (
    <Alert
      intent="danger"
      icon="trash"
      cancelButtonText="Cancel"
      confirmButtonText="Delete"
      isOpen={!!pending}
      onCancel={onCancel}
      onConfirm={onDelete}
    >
      <p>
        Are you sure you want to delete <Code>{pending?.baseUrl}</Code>?
      </p>
    </Alert>
  );
};

export const useDeleteConfirmation = (
  servers: Server[],
  onChange: (servers: Server[]) => void
) => {
  const [server, setServer] = React.useState<Server | undefined>();

  return {
    server,
    onConfirm: React.useCallback(
      (server: Server) => (event: React.MouseEvent) => {
        event.stopPropagation();
        setServer(server);
      },
      []
    ),
    onDelete: React.useCallback(() => {
      if (!server) {
        return;
      }
      const index = servers.indexOf(server);
      setServer(undefined);
      onChange([...servers.slice(0, index), ...servers.slice(index + 1)]);
    }, [server, servers]),
    onCancel: React.useCallback(() => {
      setServer(undefined);
    }, []),
  };
};
