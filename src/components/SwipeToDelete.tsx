import React, { type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Feather } from '@expo/vector-icons';

import { colors, radius } from '../theme';

const ACTION_WIDTH = 88;

interface SwipeToDeleteProps {
  children: ReactNode;
  /** Deletes the item. If it throws, the row closes and the user is told it didn't work. */
  onDelete: () => Promise<void>;
  /** Off for items the user can't delete; the row then can't be swiped at all. */
  enabled?: boolean;
  /** Should match the card inside, so the red panel tucks behind its rounded corners. */
  borderRadius?: number;
}

/**
 * Swipe left to reveal a red trash button. Tapping it asks to confirm, then deletes.
 * Screen readers get a "Delete update" action instead of the swipe.
 */
export function SwipeToDelete({
  children,
  onDelete,
  enabled = true,
  borderRadius = radius.lg,
}: SwipeToDeleteProps) {
  if (!enabled) return <>{children}</>;

  const confirmDelete = (close?: () => void) => {
    Alert.alert("Delete this update?", "Its photos will be deleted too. This can't be undone.", [
      { text: 'Cancel', style: 'cancel', onPress: close },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          onDelete().catch(() => {
            close?.();
            Alert.alert("Couldn't delete update", 'Check your connection and try again.');
          }),
      },
    ]);
  };

  const renderRightActions = (_progress: unknown, _translation: unknown, methods: SwipeableMethods) => (
    <Pressable
      onPress={() => confirmDelete(methods.close)}
      accessibilityRole="button"
      accessibilityLabel="Delete update"
      style={styles.action}
    >
      <Feather name="trash-2" size={22} color={colors.textOnPrimary} />
    </Pressable>
  );

  return (
    <View
      accessible={false}
      accessibilityActions={[{ name: 'delete', label: 'Delete update' }]}
      onAccessibilityAction={(event) => event.nativeEvent.actionName === 'delete' && confirmDelete()}
    >
      <ReanimatedSwipeable
        renderRightActions={renderRightActions}
        rightThreshold={ACTION_WIDTH / 2}
        overshootRight={false}
        friction={2}
        containerStyle={[styles.container, { borderRadius }]}
      >
        {children}
      </ReanimatedSwipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Clips the red panel to the card's rounded corners
  container: {
    overflow: 'hidden',
  },
  action: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
});
