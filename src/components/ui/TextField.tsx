import { useState, type ComponentRef, type Ref } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { colors, typography } from '@/theme';

import { Text } from './Text';

export interface TextFieldProps extends TextInputProps {
  label: string;
  /** Shown under the input and turns the border red. Replaces `helper` while shown. */
  error?: string;
  /** Hint under the input, e.g. password rules */
  helper?: string;
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

/** Labeled input from the Figma "Input field" component. */
export function TextField({ label, error, helper, ref, onFocus, onBlur, style, ...inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const borderClass = error ? 'border-danger' : focused ? 'border-primaryDark' : 'border-border';

  return (
    <View className="gap-[6px]">
      <Text variant="captionStrong">{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error ?? helper}
        placeholderTextColor={colors.textPlaceholder}
        className={`h-14 rounded-lg border bg-surface px-lg ${borderClass}`}
        // lineHeight is left out: on iOS it pushes single-line input text off center
        style={[{ fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize, color: colors.textPrimary }, style]}
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
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" color="textSecondary">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}
