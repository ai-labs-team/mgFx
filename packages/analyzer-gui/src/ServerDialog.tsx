import React from 'react';
import {
  Dialog,
  NonIdealState,
  Card,
  H5,
  Button,
  Classes,
  Tooltip,
} from '@blueprintjs/core';

import { useKey } from '@mgfx/analyzer-gui-common/hooks/useConfig';
import { Server } from './config';

import {
  AddEditDialog,
  useAddDialog,
  useEditDialog,
} from './ServerDialog/AddEditDialog';

import {
  DeleteConfirmation,
  useDeleteConfirmation,
} from './ServerDialog/DeleteConfirmation';

import './ServerDialog.scss';

type Props = {
  isOpen: boolean;
  onSelect: (server?: Server) => void;
};

export const ServerDialog: React.FC<Props> = ({ isOpen, onSelect }) => {
  const [servers, setServers] = useKey('servers');

  const select = React.useCallback(
    (server: Server) => () => {
      onSelect(server);
    },
    [servers]
  );

  const deleteConfirmation = useDeleteConfirmation(servers, setServers);
  const addDialog = useAddDialog(servers, setServers);
  const editDialog = useEditDialog(servers, setServers);

  const content = React.useMemo(() => {
    if (!servers.length) {
      return (
        <NonIdealState
          title="No Servers Configured"
          description="Add a Server configuration to get started."
        />
      );
    }

    return servers.map((server, index) => (
      <Card key={index} interactive onClick={select(server)}>
        <H5>{server.baseUrl}</H5>
        <div className="tools">
          <Tooltip content="Edit Server">
            <Button minimal icon="edit" onClick={editDialog.onEdit(server)} />
          </Tooltip>
          <Tooltip content="Delete Server">
            <Button
              minimal
              icon="trash"
              onClick={deleteConfirmation.onConfirm(server)}
            />
          </Tooltip>
        </div>
      </Card>
    ));
  }, [servers]);

  return (
    <Dialog
      isOpen={isOpen}
      title="Select Server"
      isCloseButtonShown={false}
      className="server-dialog"
    >
      <div className={Classes.DIALOG_BODY}>{content}</div>
      <div className={Classes.DIALOG_FOOTER}>
        <Button
          onClick={addDialog.onAdd}
          text="Add Server"
          intent="primary"
          icon="add"
        />
      </div>
      <AddEditDialog
        isOpen={addDialog.isOpen}
        onSave={addDialog.onSave}
        onCancel={addDialog.onCancel}
      />
      <AddEditDialog
        server={editDialog.server}
        onSave={editDialog.onSave}
        onCancel={editDialog.onCancel}
      />
      <DeleteConfirmation
        server={deleteConfirmation.server}
        onDelete={deleteConfirmation.onDelete}
        onCancel={deleteConfirmation.onCancel}
      />
    </Dialog>
  );
};
