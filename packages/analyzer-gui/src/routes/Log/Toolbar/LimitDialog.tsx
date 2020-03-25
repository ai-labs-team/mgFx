import React from 'react';
import {
  Classes,
  Dialog,
  Callout,
  Button,
  RadioGroup,
  Radio,
  FormGroup,
  NumericInput
} from '@blueprintjs/core';
import { assocPath } from 'ramda';

import { useConfig } from '../../../hooks/useConfig';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const LimitDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const { state, apply } = useConfig();
  const [limit, setLimit] = React.useState(state.logParameters.limit);
  const [isInfinite, setIsInfinite] = React.useState(
    limit === undefined ? ('infinite' as const) : ('number' as const)
  );

  React.useEffect(() => {
    setLimit(isInfinite === 'infinite' ? undefined : limit || 100);
  }, [isInfinite]);

  return (
    <Dialog title="Configure Display Limit" isOpen={isOpen} onClose={onClose}>
      <div className={Classes.DIALOG_BODY}>
        <Callout>
          Limits the number of Processes that are fetched from the Analyzer
          server, thereby reducing network traffic size and server load.
        </Callout>
        <RadioGroup
          label="Display Limit"
          onChange={event => {
            setIsInfinite(event.currentTarget.value as any);
          }}
          selectedValue={isInfinite}
        >
          <Radio value="infinite" label="Infinite" />
          <Radio value="number" label="Limited" />
        </RadioGroup>
        {isInfinite === 'number' ? (
          <FormGroup label="Limit">
            <NumericInput
              min={1}
              value={limit || 100}
              onValueChange={setLimit}
            />
          </FormGroup>
        ) : (
          <Callout intent="warning">
            <p>
              The HTTP Analyzer server currently has no hard limit on the number
              of Processes returned.
            </p>
            <p>This option may well cause your Analyzer server to explode.</p>
            <p>You have been warned.</p>
          </Callout>
        )}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            intent="primary"
            text="OK"
            icon="tick"
            onClick={() => {
              apply(assocPath(['logParameters', 'limit'], limit));
              onClose();
            }}
          />
          <Button text="Cancel" onClick={onClose} />
        </div>
      </div>
    </Dialog>
  );
};
