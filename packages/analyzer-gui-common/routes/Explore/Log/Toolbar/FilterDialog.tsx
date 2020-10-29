import React from 'react';
import {
  Classes,
  Dialog,
  Button,
  RadioGroup,
  Radio,
  FormGroup,
  InputGroup,
} from '@blueprintjs/core';
import { assocPath } from 'ramda';

import { useConfig } from 'src/hooks/useConfig';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const FilterDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const { state, apply } = useConfig();
  const [name, setName] = React.useState(state.logParameters.scope?.spec?.name);
  const [nameType, setNameType] = React.useState(name ? 'equals' : 'any');

  React.useEffect(() => {
    setName(nameType === 'all' ? undefined : name);
  }, [nameType]);

  return (
    <Dialog title="Configure Filters" isOpen={isOpen} onClose={onClose}>
      <div className={Classes.DIALOG_BODY}>
        <RadioGroup
          label="Name"
          onChange={(event) => {
            setNameType(event.currentTarget.value as any);
          }}
          selectedValue={nameType}
        >
          <Radio value="any" label="Any" />
          <Radio value="equals" label="Equals" />
        </RadioGroup>
        {nameType === 'equals' ? (
          <FormGroup>
            <InputGroup
              value={name}
              onChange={(event: any) => setName(event.target.value)}
            />
          </FormGroup>
        ) : null}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            intent="primary"
            text="OK"
            icon="tick"
            onClick={() => {
              apply(
                assocPath(
                  ['logParameters', 'scope', 'spec'],
                  nameType === 'equals' ? { name } : undefined
                )
              );
              onClose();
            }}
          />
          <Button text="Cancel" onClick={onClose} />
        </div>
      </div>
    </Dialog>
  );
};
