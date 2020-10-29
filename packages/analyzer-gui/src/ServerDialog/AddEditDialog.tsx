import React from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  Classes,
  Button,
  FormGroup,
  InputGroup,
} from '@blueprintjs/core';
import { Checkbox } from '@mgfx/analyzer-gui-common/components/Checkbox';

import { Server } from '../config';

type Props = {
  isOpen?: boolean;
  server?: Server;
  onCancel: () => void;
  onSave: (server: Server) => void;
};

const URL_REGEX = /https?:\/\/.*(?:\:\d+)?/i;

export const AddEditDialog: React.FC<Props> = ({
  isOpen,
  server,
  onCancel,
  onSave,
}) => {
  const form = useForm<Server>({
    mode: 'onTouched',
  });
  return (
    <Dialog
      isOpen={isOpen || !!server}
      title={server ? 'Edit Server' : 'Add Server'}
      onClose={onCancel}
    >
      <form onSubmit={form.handleSubmit(onSave)}>
        <div className={Classes.DIALOG_BODY}>
          <FormGroup
            label="Server URL"
            labelFor="baseUrl"
            labelInfo="(required)"
            intent={form.errors.baseUrl ? 'danger' : 'none'}
            helperText={form.errors.baseUrl?.message}
          >
            <InputGroup
              id="baseUrl"
              name="baseUrl"
              intent={form.errors.baseUrl ? 'danger' : 'none'}
              defaultValue={server?.baseUrl}
              inputRef={form.register({
                required: true,
                pattern: {
                  value: URL_REGEX,
                  message:
                    'Must be a valid HTTP(S) URL, including protocol prefix.',
                },
              })}
            />
          </FormGroup>
          <FormGroup
            inline
            label="Use Delta compression"
            labelFor="deltas"
            labelInfo="(experimental)"
            helperText="Attempts to reduce payload size, at the expense of processing overhead on client and server."
          >
            <Checkbox
              control={form.control}
              name="deltas"
              id="deltas"
              defaultChecked={server?.deltas}
            />
          </FormGroup>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button type="submit" text="Save" intent="primary" icon="tick" />
            <Button text="Cancel" onClick={onCancel} />
          </div>
        </div>
      </form>
    </Dialog>
  );
};

export const useAddDialog = (
  servers: Server[],
  onChange: (servers: Server[]) => void
) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return {
    isOpen,
    onAdd: React.useCallback(() => setIsOpen(true), []),
    onCancel: React.useCallback(() => setIsOpen(false), []),
    onSave: React.useCallback(
      (server: Server) => {
        setIsOpen(false);
        onChange([...servers, server]);
      },
      [servers]
    ),
  };
};

export const useEditDialog = (
  servers: Server[],
  onChange: (servers: Server[]) => void
) => {
  const [server, setServer] = React.useState<Server | undefined>();

  return {
    server,
    onEdit: React.useCallback(
      (server: Server) => (event: React.MouseEvent) => {
        event.stopPropagation();
        setServer(server);
      },
      []
    ),
    onSave: React.useCallback(
      (editedServer: Server) => {
        if (!server) {
          return;
        }

        const index = servers.indexOf(server);

        onChange([
          ...servers.slice(0, index),
          editedServer,
          ...servers.slice(index + 1),
        ]);

        setServer(undefined);
      },
      [servers, server]
    ),
    onCancel: () => setServer(undefined),
  };
};
