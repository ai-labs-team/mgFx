import React from 'react';
import { Dialog, Classes, Button, RadioGroup, Radio } from '@blueprintjs/core';
import { assoc } from 'ramda';

import { useConfig } from '../hooks/useConfig';
import { ServerList } from './ConfigDialog/ServerList';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const ConfigDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const { state, setState, apply, reset } = useConfig();

  const onApply = React.useCallback(() => {
    apply();
  }, [state]);

  const onOk = React.useCallback(() => {
    onApply();
    onClose();
  }, [onApply]);

  React.useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen]);

  return (
    <Dialog isOpen={isOpen} title="Configuration" isCloseButtonShown={false}>
      <div className={Classes.DIALOG_BODY}>
        <RadioGroup
          label="Theme"
          selectedValue={state.theme}
          onChange={event =>
            setState(assoc('theme', event.currentTarget.value))
          }
        >
          <Radio label="Light" value="light" />
          <Radio label="Dark" value="dark" />
        </RadioGroup>
        <ServerList
          servers={state.servers}
          onChange={servers => setState(assoc('servers', servers))}
        />
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button text="OK" intent="primary" icon="tick" onClick={onOk} />
          <Button text="Cancel" onClick={onClose} />
          <Button text="Apply" onClick={onApply} />
        </div>
      </div>
    </Dialog>
  );
};
