import React from 'react';
import {
  RadioGroup as BaseRadioGroup,
  IRadioGroupProps,
} from '@blueprintjs/core';
import { Controller, ControllerProps } from 'react-hook-form';

type Props = Omit<IRadioGroupProps, 'selectedValue' | 'onChange'> &
  Pick<ControllerProps<any>, 'control' | 'name' | 'defaultValue'>;

export const RadioGroup: React.FC<Props> = ({
  control,
  name,
  defaultValue,
  ...props
}) => {
  return (
    <Controller
      control={control}
      name={name}
      defaultValue={defaultValue}
      render={({ onChange, value }) => (
        <BaseRadioGroup
          {...props}
          selectedValue={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      )}
    />
  );
};
