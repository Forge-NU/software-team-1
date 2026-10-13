import React, { useState } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useProfile } from '../context/ProfileContext'
import TopBar from '../components/TopBar'
import { cardShadow, colors, fontFamily } from './theme'

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
      <Feather name="chevron-down" size={20} color={colors.brand} />
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
              trackColor={{ true: colors.primary, false: colors.border }}
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
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 22, paddingBottom: 32 },
  stack: { gap: 14 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    ...cardShadow,
  },
  section: { fontFamily, fontSize: 24, fontWeight: '600', color: colors.text, marginTop: 28, marginBottom: 14 },

  notifCard: { padding: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleText: { flex: 1, paddingRight: 12 },
  itemTitle: { fontFamily, fontSize: 18, fontWeight: '500', color: colors.text },
  itemSub: { fontFamily, fontSize: 15, color: colors.muted, marginTop: 6, lineHeight: 20 },

  statusCard: {
    backgroundColor: colors.innerCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  statusTitle: { fontFamily, fontSize: 14, fontWeight: '600', color: colors.text },
  statusBody: { fontFamily, fontSize: 14, color: colors.slate, marginTop: 8, lineHeight: 20 },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 18 },
})
