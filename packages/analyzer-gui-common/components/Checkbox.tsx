import React from 'react';
import { Checkbox as BaseCheckbox, ICheckboxProps } from '@blueprintjs/core';
import { Controller, ControllerProps } from 'react-hook-form';

type Props = Omit<ICheckboxProps, 'checked' | 'onBlur' | 'onChange'> &
  Pick<ControllerProps<any>, 'control' | 'name' | 'defaultChecked'>;

export const Checkbox: React.FC<Props> = ({
  control,
  name,
  defaultChecked,
  ...props
}) => {
  return (
    <Controller
      control={control}
      name={name}
      defaultValue={defaultChecked}
      render={({ onChange, onBlur, value }) => (
        <BaseCheckbox
          {...props}
          checked={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
      )}
    />
  );
};
