import { useState, type Ref } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/theme/tokens';

export interface TextFieldProps extends TextInputProps {
  label: string;
  /** Shown under the input in red; also turns the border red. Replaces `helper` while shown. */
  error?: string;
  /** Gray hint under the input, e.g. password rules */
  helper?: string;
  ref?: Ref<TextInput>;
}

export function TextField({
  label,
  error,
  helper,
  ref,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  const borderClass = error ? 'border-danger' : focused ? 'border-primary' : 'border-line';

  return (
    <View className="gap-2">
      <Text className="font-sans-semibold text-label text-ink">{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.ink.subtle}
        className={`h-[52px] rounded-input border bg-surface px-4 font-sans text-body text-ink ${borderClass}`}
        {...inputProps}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
      {error ? (
        <Text accessibilityRole="alert" className="font-sans text-caption text-danger">
          {error}
        </Text>
      ) : helper ? (
        <Text className="font-sans text-caption text-ink-muted">{helper}</Text>
      ) : null}
    </View>
  );
}
