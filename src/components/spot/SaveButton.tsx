import { Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Text } from '@/components/ui';
import { colors } from '@/theme';

interface SaveButtonProps {
  // The Save button's null and disabled until it's finished loading the saved state
  saved: boolean | null;
  onPress: () => void;
}

// Button shows as either Save or Saved 
export default function SaveButton({ saved, onPress }: SaveButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={saved === null}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from saved spots' : 'Save spot'}
      accessibilityState={{ selected: !!saved, disabled: saved === null }}
      className={`flex-row items-center gap-xxs rounded-pill px-sm py-xs active:opacity-80 ${
        saved ? 'bg-primaryLight' : 'border border-border bg-surface'
      } ${saved === null ? 'opacity-60' : ''}`}
    >
      {saved && <Feather name="check" size={14} color={colors.textPrimary} />}
      <Text variant="bodySmall" color="textPrimary">
        {saved ? 'Saved' : 'Save'}
      </Text>
    </Pressable>
  );
}
