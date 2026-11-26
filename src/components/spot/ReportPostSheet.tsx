import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ReportResult } from '../../hooks/useSpotDetails';
import { colors, radius, spacing, typography } from '../../theme';

// Not in Figma yet; wording to confirm with design (F-13)
export const REPORT_REASONS = [
  'Wrong or outdated info',
  'Inappropriate or offensive',
  'Spam or fake',
] as const;

type Step =
  | { kind: 'choose' }
  | { kind: 'sending' }
  | { kind: 'done'; result: ReportResult }
  | { kind: 'failed'; reason: string };

interface ReportPostSheetProps {
  /** The post being reported, or null when the sheet is closed */
  postId: number | null;
  onSubmit: (postId: number, reason: string) => Promise<ReportResult>;
  onClose: () => void;
}

/**
 * Bottom sheet for reporting a post: pick a reason, then a confirmation.
 * A sheet rather than an Alert, since Android alerts only fit three buttons.
 */
export default function ReportPostSheet({ postId, onSubmit, onClose }: ReportPostSheetProps) {
  const { bottom } = useSafeAreaInsets();
  const [step, setStep] = useState<Step>({ kind: 'choose' });

  const close = () => {
    if (step.kind === 'sending') return;
    onClose();
    setStep({ kind: 'choose' });
  };

  const send = async (reason: string) => {
    if (postId === null) return;
    setStep({ kind: 'sending' });
    try {
      setStep({ kind: 'done', result: await onSubmit(postId, reason) });
    } catch {
      setStep({ kind: 'failed', reason });
    }
  };

  return (
    <Modal visible={postId !== null} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />

      <View style={[styles.sheet, { paddingBottom: spacing.lg + bottom }]}>
        {step.kind === 'choose' && (
          <>
            <Text style={styles.title} accessibilityRole="header">
              Report this update
            </Text>
            <Text style={styles.body}>Why are you reporting it?</Text>
            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason}
                onPress={() => send(reason)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              >
                <Text style={styles.optionText}>{reason}</Text>
              </Pressable>
            ))}
            <SheetButton label="Cancel" onPress={close} />
          </>
        )}

        {step.kind === 'sending' && (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primaryDark} />
            <Text style={styles.body}>Sending report…</Text>
          </View>
        )}

        {step.kind === 'done' && (
          <>
            <Text style={styles.title} accessibilityRole="header">
              {step.result === 'reported' ? 'Thanks for reporting' : 'Already reported'}
            </Text>
            <Text style={styles.body} accessibilityLiveRegion="polite">
              {step.result === 'reported'
                ? 'We’ll take a look. The update stays visible while we review it.'
                : 'You’ve already reported this update. We’ll take a look.'}
            </Text>
            <SheetButton label="Done" onPress={close} primary />
          </>
        )}

        {step.kind === 'failed' && (
          <>
            <Text style={styles.title} accessibilityRole="header">
              Report not sent
            </Text>
            <Text style={[styles.body, styles.error]} accessibilityRole="alert">
              Something went wrong. Check your connection and try again.
            </Text>
            <SheetButton label="Try again" onPress={() => send(step.reason)} primary />
            <SheetButton label="Cancel" onPress={close} />
          </>
        )}
      </View>
    </Modal>
  );
}

function SheetButton({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, primary && styles.buttonPrimary, pressed && styles.pressed]}
    >
      <Text style={[styles.buttonText, primary && styles.buttonTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  centered: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  body: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  error: {
    color: colors.danger,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  button: {
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
  },
  buttonPrimary: {
    backgroundColor: colors.primaryDark,
  },
  buttonText: {
    ...typography.bodyStrong,
    color: colors.primaryDark,
  },
  buttonTextPrimary: {
    color: colors.textOnPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
});
