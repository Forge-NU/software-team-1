import React, { useState } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useProfile } from '../context/ProfileContext'
import TopBar from '../components/TopBar'
import { colors, layout, radius, spacing, typography } from '../theme'

// Placeholder for F-7, built from the hi-fi Settings frame. The toggle and the
// preferences summary aren't saved anywhere yet.
export interface SettingsScreenProps {
  onBack?: () => void
  onOpenPreferences: () => void
}

function Row({ title, subtitle, onPress }: { title: string; subtitle: string; onPress?: () => void }) {
  return (
    <Pressable style={[styles.card, styles.row]} onPress={onPress} disabled={!onPress}>
      <View style={styles.flex}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSub}>{subtitle}</Text>
      </View>
      <Feather name="chevron-down" size={20} color={colors.primary} />
    </Pressable>
  )
}

export default function SettingsScreen({ onBack, onOpenPreferences }: SettingsScreenProps) {
  const { profile } = useProfile()
  const [savedSpotAlerts, setSavedSpotAlerts] = useState(false)

  return (
    <View style={styles.screen}>
      <TopBar title="Settings" size="large" onBack={onBack} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Notifications</Text>
        <View style={[styles.card, styles.notifCard]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.itemTitle}>Saved spot updates</Text>
              <Text style={styles.itemSub}>Notify me when a saved spot gets a new report.</Text>
            </View>
            <Switch
              value={savedSpotAlerts}
              onValueChange={setSavedSpotAlerts}
              trackColor={{ true: colors.primaryDark, false: colors.border }}
              ios_backgroundColor={colors.border}
              accessibilityLabel="Saved spot updates"
            />
          </View>
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>
              {savedSpotAlerts ? 'On · Changes saved' : 'Off · Changes saved'}
            </Text>
            <Text style={styles.statusBody}>
              {savedSpotAlerts
                ? "You'll get an alert when a saved spot gets a new report."
                : 'Saved-spot alerts are off. You can still check current reports in Saved.'}
            </Text>
          </View>
        </View>

        <Text style={styles.section}>Personalization</Text>
        <Row title="Study preferences" subtitle="Quiet · Outlets" onPress={onOpenPreferences} />

        <Text style={styles.section}>Privacy and account</Text>
        <View style={styles.stack}>
          <Row
            title="Location permission"
            subtitle="While using the app · Manage in device settings"
            onPress={() => Linking.openSettings()}
          />
          <Row title="School email" subtitle={profile?.email ?? 'No email on file'} />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: layout.screenPaddingHorizontal, paddingBottom: spacing.xl },
  stack: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  section: { ...typography.title, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm },

  notifCard: { padding: spacing.md },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleText: { flex: 1, paddingRight: spacing.sm },
  itemTitle: { ...typography.heading, color: colors.textPrimary },
  itemSub: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xxs },

  statusCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  statusTitle: { ...typography.label, color: colors.textPrimary },
  statusBody: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xxs },

  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
})
