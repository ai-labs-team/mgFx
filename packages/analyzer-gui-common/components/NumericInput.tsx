import React from 'react';
import {
  NumericInput as BaseNumericInput,
  INumericInputProps,
} from '@blueprintjs/core';
import { Controller, ControllerProps } from 'react-hook-form';

type Props = Omit<INumericInputProps, 'value' | 'onBlur' | 'onValueChange'> &
  Pick<ControllerProps<any>, 'control' | 'name' | 'defaultValue'>;

export const NumericInput: React.FC<Props> = ({
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
      render={({ onChange, onBlur, value }) => (
        <BaseNumericInput
          {...props}
          value={value}
          onBlur={onBlur}
          onValueChange={(value) => onChange(value)}
        />
      )}
    />
  );
};
