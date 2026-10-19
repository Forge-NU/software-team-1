import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

import { TextField, type TextFieldProps } from './TextField';

type FormTextFieldProps<T extends FieldValues> = Omit<
  TextFieldProps,
  'value' | 'onChangeText' | 'onBlur' | 'error' | 'ref'
> & {
  control: Control<T>;
  name: Path<T>;
};

/** TextField wired to React Hook Form: shows the field's Zod error inline automatically. */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  ...fieldProps
}: FormTextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref, value, onChange, onBlur }, fieldState: { error } }) => (
        <TextField
          ref={ref}
          value={value ?? ''}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error?.message}
          {...fieldProps}
        />
      )}
    />
  );
}
