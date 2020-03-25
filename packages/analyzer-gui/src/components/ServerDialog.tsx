import React from 'react';
import {
  Dialog,
  NonIdealState,
  Card,
  H5,
  Button,
  Classes
} from '@blueprintjs/core';

import { Server } from '../config';
import { useKey } from '../hooks/useConfig';
import { useAppContext } from '..//contexts/App';

type Props = {
  isOpen: boolean;
  onSelect: (server: Server) => void;
};

export const ServerDialog: React.FC<Props> = ({ isOpen, onSelect }) => {
  const servers = useKey('servers');
  const { showConfig } = useAppContext();

  const content = React.useMemo(() => {
    if (!servers.length) {
      return (
        <NonIdealState
          title="No Servers Configured"
          description="Use the Configuration Dialog to add a Server Configuration."
          action={
            <Button
              onClick={showConfig}
              text="Edit Configuration"
              intent="primary"
            />
          }
        />
      );
    }

    return servers.map((server, index) => (
      <Card key={index} interactive onClick={() => onSelect(server)}>
        <H5 style={{ marginBottom: 0 }}>{server.baseUrl}</H5>
      </Card>
    ));
  }, [servers]);

  return (
    <Dialog
      isOpen={isOpen}
      title="Select Server"
      isCloseButtonShown={false}
      style={{ paddingBottom: 0 }}
    >
      <div className={Classes.DIALOG_BODY}>{content}</div>
    </Dialog>
  );
};
