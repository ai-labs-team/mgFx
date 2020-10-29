import React from 'react';
import { useForm } from 'react-hook-form';
import {
  Classes,
  Dialog,
  Callout,
  Button,
  Radio,
  FormGroup,
} from '@blueprintjs/core';

import { RadioGroup } from '../../../../components/RadioGroup';
import { NumericInput } from '../../../../components/NumericInput';
import { useConfig } from '../../../../hooks/useConfig';

import './LimitDialog.scss';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type Form = {
  mode: 'infinite' | 'limited';
  limit: number;
};

export const LimitDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const { state, apply } = useConfig();

  const onSave = React.useCallback(
    (form: Form) => {
      apply({
        ...state,
        logParameters: {
          ...state.logParameters,
          limit: form.mode === 'infinite' ? undefined : form.limit,
        },
      });
      onClose();
    },
    [state]
  );

  const form = useForm<Form>();
  const defaultMode =
    state.logParameters.limit === undefined ? 'infinite' : 'limited';
  const mode = form.watch('mode', defaultMode);

  return (
    <Dialog
      className="limit-dialog"
      title="Configure Display Limit"
      isOpen={isOpen}
      onClose={onClose}
    >
      <form onSubmit={form.handleSubmit(onSave)}>
        <div className={Classes.DIALOG_BODY}>
          <Callout>
            Limits the number of Processes that are fetched from the Analyzer
            server, thereby reducing network traffic size and server load.
          </Callout>
          <FormGroup label="Display Limit" inline>
            <RadioGroup
              control={form.control}
              defaultValue={defaultMode}
              name="mode"
            >
              <Radio value="infinite" label="Infinite" />
              <Radio value="limited" label="Limited" />
            </RadioGroup>
            {mode === 'limited' && (
              <NumericInput
                min={1}
                defaultValue={state.logParameters.limit || 100}
                control={form.control}
                name="limit"
              />
            )}
          </FormGroup>
          {mode === 'infinite' && (
            <Callout intent="warning">
              <p>
                The HTTP Analyzer server currently has no hard limit on the
                number of Processes returned.
              </p>
              <p>This option may well cause your Analyzer server to explode.</p>
              <p>You have been warned.</p>
            </Callout>
          )}
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button intent="primary" text="OK" icon="tick" type="submit" />
            <Button text="Cancel" onClick={onClose} />
          </div>
        </div>
      </form>
    </Dialog>
  );
};
