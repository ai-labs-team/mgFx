import React from 'react';
import { Dialog, Classes, Button, Radio, FormGroup } from '@blueprintjs/core';
import { useForm } from 'react-hook-form';

import { useConfig } from '../hooks/useConfig';
import { Config } from '../config';
import { RadioGroup } from './RadioGroup';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const ConfigDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const { state, apply } = useConfig();

  const form = useForm<Config>();

  const onApply = React.useCallback(
    (config: Config) => {
      apply({ ...state, ...config });
    },
    [state]
  );

  const onOk = React.useCallback(
    (config: Config) => {
      apply({ ...state, ...config });
      onClose();
    },
    [state]
  );

  return (
    <Dialog isOpen={isOpen} title="Configuration" isCloseButtonShown={false}>
      <form onSubmit={form.handleSubmit(onApply)}>
        <div className={Classes.DIALOG_BODY}>
          <FormGroup label="UI Theme" inline>
            <RadioGroup
              control={form.control}
              name="theme"
              defaultValue={state.theme}
            >
              <Radio label="Light" value="light" />
              <Radio label="Dark" value="dark" />
            </RadioGroup>
          </FormGroup>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              text="Save"
              intent="primary"
              icon="tick"
              onClick={form.handleSubmit(onOk)}
            />
            <Button text="Cancel" onClick={onClose} />
            <Button type="submit" text="Apply" />
          </div>
        </div>
      </form>
    </Dialog>
  );
};
