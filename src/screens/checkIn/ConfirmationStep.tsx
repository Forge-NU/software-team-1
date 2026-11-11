import React from 'react'
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { crowdingLabel, noiseLabel, PostedCheckIn } from '../../lib/checkIn'
import TopBar from '../../components/TopBar'
import Badge from '../../components/Badge'
import Button from '../../components/Button'
import { colors, layout, radius, spacing, typography } from '../../theme'

interface ConfirmationStepProps {
  posted: PostedCheckIn
  /** From useProfile(), so a rename on the Profile screen shows up here. */
  displayName: string | null
  onViewSpot: () => void
  onBackToExplore: () => void
}

const firstWord = (s: string) => s.trim().split(/\s+/)[0]

export default function ConfirmationStep({
  posted,
  displayName,
  onViewSpot,
  onBackToExplore,
}: ConfirmationStepProps) {
  const firstName = displayName ? firstWord(displayName) : null
  const extras = [posted.outlets ? 'Outlets available' : null, '1 photo added'].filter(Boolean).join(' · ')

  return (
    <View style={styles.screen}>
      <TopBar title="Update posted" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, styles.hero]}>
          <View style={styles.checkOuter}>
            <View style={styles.checkInner}>
              <Feather name="check" size={26} color={colors.primary} />
            </View>
          </View>
          <Text style={styles.thanks}>{firstName ? `Thanks, ${firstName}.` : 'Thanks!'}</Text>
          <Text style={styles.thanksSub}>Your update helps the next student find a spot.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{posted.location.name}</Text>
            <Badge label="Posted just now" />
          </View>
          <Text style={styles.line}>Posted just now{firstName ? ` · ${firstName} (you)` : ''}</Text>
          <Text style={styles.line}>Crowding: {crowdingLabel(posted.crowding)}</Text>
          <Text style={styles.line}>Noise: {noiseLabel(posted.noise)}</Text>
          {!!posted.note && <Text style={styles.line}>“{posted.note}”</Text>}
          <View style={[styles.rowBetween, styles.cardFooter]}>
            <Text style={styles.extras}>{extras}</Text>
            <Badge label="Live" />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Photo</Text>
            <Badge label="1 added" />
          </View>
          <Image source={{ uri: posted.photo.uri }} style={styles.photo} accessibilityLabel="Your check-in photo" />
        </View>

        <View style={styles.actions}>
          <Button label={`View my update at ${firstWord(posted.location.name)}`} onPress={onViewSpot} />
          <Button label="Back to Explore" variant="outline" onPress={onBackToExplore} />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: layout.screenPaddingHorizontal, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.xs,
    shadowColor: colors.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  checkOuter: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInner: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thanks: { ...typography.display, color: colors.textPrimary, marginTop: spacing.md },
  thanksSub: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { ...typography.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  line: { ...typography.bodySmall, color: colors.textPrimary },
  cardFooter: { marginTop: spacing.sm },
  extras: { ...typography.bodySmall, color: colors.textSecondary },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    marginTop: spacing.xs,
  },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
})
