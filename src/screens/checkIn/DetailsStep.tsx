import React from 'react'
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import {
  CheckInPhoto,
  Crowding,
  CROWDING_OPTIONS,
  Noise,
  NOISE_OPTIONS,
} from '../../lib/checkIn'
import FlowHeader from '../../components/FlowHeader'
import Button from '../../components/Button'
import { colors, layout, radius, spacing, typography } from '../../theme'

const MAX_NOTE_LENGTH = 140

interface DetailsStepProps {
  spotName: string
  photo: CheckInPhoto
  crowding: Crowding | null
  noise: Noise | null
  outlets: boolean
  note: string
  onCrowding: (v: Crowding) => void
  onNoise: (v: Noise) => void
  onOutlets: (v: boolean) => void
  onNote: (v: string) => void
  onRetake: () => void
  onSubmit: () => void
  onBack: () => void
  onCancel: () => void
  submitting: boolean
  progress: number
  submitError: string | null
}

function Chips<T extends string>({
  options,
  selected,
  onSelect,
  label,
}: {
  options: { value: T; label: string }[]
  selected: T | null
  onSelect: (v: T) => void
  label: string
}) {
  return (
    <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const active = o.value === selected
        return (
          <Pressable
            key={o.value}
            onPress={() => onSelect(o.value)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export default function DetailsStep(props: DetailsStepProps) {
  const {
    spotName, photo, crowding, noise, outlets, note,
    onCrowding, onNoise, onOutlets, onNote, onRetake, onSubmit, onBack, onCancel,
    submitting, progress, submitError,
  } = props

  const ready = crowding !== null && noise !== null
  const buttonLabel = submitting
    ? `Posting… ${Math.round(progress * 100)}%`
    : submitError
      ? 'Try again'
      : 'Post update'

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlowHeader title="Check in" onBack={submitting ? undefined : onBack} onCancel={submitting ? undefined : onCancel} cancelStyle="pill" />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.step}>STEP 2 OF 2 · CONDITIONS</Text>
        <Text style={styles.spotName}>{spotName}</Text>

        <View style={styles.photoRow}>
          <Image source={{ uri: photo.uri }} style={styles.thumb} accessibilityLabel="Your check-in photo" />
          <View>
            <Text style={styles.photoTitle}>Room photo added</Text>
            <Pressable onPress={onRetake} disabled={submitting} hitSlop={8} accessibilityRole="button">
              <Text style={styles.photoSub}>Just now · Retake →</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.question}>How crowded is it?</Text>
        <Chips options={CROWDING_OPTIONS} selected={crowding} onSelect={onCrowding} label="How crowded is it?" />

        <Text style={styles.question}>How noisy is it?</Text>
        <Chips options={NOISE_OPTIONS} selected={noise} onSelect={onNoise} label="How noisy is it?" />

        <Text style={styles.sectionTitle}>Amenities right now</Text>
        <Pressable
          style={styles.checkRow}
          onPress={() => onOutlets(!outlets)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: outlets }}
        >
          <View style={[styles.checkCircle, outlets && styles.checkCircleOn]}>
            {outlets && <Feather name="check" size={16} color={colors.textPrimary} />}
          </View>
          <Text style={styles.checkLabel}>Outlets available</Text>
        </Pressable>

        <Text style={styles.question}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={onNote}
          placeholder="Seats open, just as reported."
          placeholderTextColor={colors.textSecondary}
          maxLength={MAX_NOTE_LENGTH}
          style={styles.noteInput}
          accessibilityLabel="Note"
        />
        <Text style={styles.footnote}>Your name and update time will appear with this report.</Text>

        {submitError && (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Text style={styles.errorTitle}>Couldn’t post your update</Text>
            <Text style={styles.errorBody}>
              {submitError} Your photo and answers are saved, so you can try again.
            </Text>
          </View>
        )}

        {submitting && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        )}

        <Button label={buttonLabel} onPress={onSubmit} disabled={!ready} loading={submitting} />
        {!ready && !submitting && (
          <Text style={styles.readyHint}>Pick how crowded and how noisy it is to post.</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenPaddingHorizontal, paddingBottom: spacing.xl * 2 },
  step: { ...typography.label, color: colors.textSecondary, marginTop: spacing.lg },
  spotName: { ...typography.title, color: colors.textPrimary, marginTop: spacing.xs },

  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  thumb: {
    width: 104,
    height: 76,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryLight,
  },
  photoTitle: { ...typography.label, color: colors.textPrimary },
  photoSub: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xxs },

  question: { ...typography.body, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.xs },
  sectionTitle: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.xs },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primaryDark },
  chipText: { ...typography.body, color: colors.textPrimary },
  chipTextActive: { ...typography.bodyStrong, color: colors.primaryDark },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  checkCircle: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleOn: { backgroundColor: colors.primary },
  checkLabel: { ...typography.body, color: colors.textPrimary },

  noteInput: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  footnote: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.md },

  errorBox: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  errorTitle: { ...typography.label, color: colors.danger },
  errorBody: { ...typography.bodySmall, color: colors.textPrimary, marginTop: spacing.xxs },

  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: { height: '100%', backgroundColor: colors.primaryDark },
  readyHint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
})
