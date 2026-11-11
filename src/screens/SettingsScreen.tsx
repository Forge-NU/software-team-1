import React, { useCallback, useEffect, useState } from 'react'
import { AppState, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useProfile } from '../context/ProfileContext'
import TopBar from '../components/TopBar'
import { colors, layout, radius, spacing, typography } from '../theme'
import { summarizePreferences } from '../lib/profile'
import { getLocationPermission, LocationPermission, openAppSettings } from '../lib/locationPermisson'

export interface SettingsScreenProps {
  onBack?: () => void
  onOpenPreferences: () => void
}

type SaveState = 'idle' | 'saving' | 'error'

// Device state, not account data, so it can outlive the screen (and a sign out) to avoid a flash on return
let lastLocationPermission: LocationPermission | null = null

const LOCATION_SUBTITLES: Record<LocationPermission, string> = {
  precise: 'While using the app · Manage in device settings',
  approximate: 'Approximate, while using the app · Manage in device settings',
  denied: 'Not allowed · Manage in device settings',
  blocked: 'Off · Turn on in device settings',
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
  // Preferences live in ProfileContext so the last loaded values show right away on return
  const { profile, preferences, refreshPreferences, savePreferences } = useProfile()
  const prefsLoaded = preferences !== null
  const [prefsError, setPrefsError] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [locationPermission, setLocationPermission] = useState<LocationPermission | null>(lastLocationPermission)

  // Refreshes in the background; whatever is already shown stays until the new values arrive
  const loadPreferences = useCallback(async () => {
    try {
      await refreshPreferences()
      setPrefsError(false)
    } catch (err) {
      console.error('Failed to load preferences', err)
      setPrefsError(true)
    }
  }, [refreshPreferences])

  const loadLocationPermission = useCallback(async () => {
    try {
      lastLocationPermission = await getLocationPermission()
      setLocationPermission(lastLocationPermission)
    } catch (err) {
      console.error('Failed to read location permission', err)
    }
  }, [])

  // Reload when coming back from the Study preferences screen
  useFocusEffect(
    useCallback(() => {
      loadPreferences()
      loadLocationPermission()
    }, [loadPreferences, loadLocationPermission]),
  )

  // Returning from device settings doesn't refocus the screen, so watch the app state too
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadLocationPermission()
    })
    return () => sub.remove()
  }, [loadLocationPermission])

  // savePreferences flips the switch right away and flips it back if the save fails
  const toggleSavedSpotAlerts = async (value: boolean) => {
    setSaveState('saving')
    try {
      await savePreferences({ notifySavedUpdates: value })
      setSaveState('idle')
    } catch (err) {
      console.error('Failed to save notification setting', err)
      setSaveState('error')
    }
  }

  const alertsOn = preferences?.notifySavedUpdates ?? false
  const onOff = alertsOn ? 'On' : 'Off'
  const statusTitle = !prefsLoaded
    ? prefsError
      ? "Couldn't load this setting"
      : 'Loading…'
    : saveState === 'saving'
      ? `${onOff} · Saving…`
      : saveState === 'error'
        ? `${onOff} · Couldn't save. Try again.`
        : `${onOff} · Changes saved`
  const statusBody = !prefsLoaded
    ? prefsError
      ? 'Check your connection and come back to this screen.'
      : ''
    : alertsOn
      ? "You'll get an alert when a saved spot gets a new report."
      : 'Saved-spot alerts are off. You can still check current reports in Saved.'

  const preferencesSubtitle = preferences
    ? summarizePreferences(preferences) ?? 'Not set'
    : prefsError
      ? "Couldn't load"
      : 'Loading…'

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
              value={alertsOn}
              onValueChange={toggleSavedSpotAlerts}
              disabled={!prefsLoaded || saveState === 'saving'}
              trackColor={{ true: colors.primaryDark, false: colors.border }}
              ios_backgroundColor={colors.border}
              accessibilityLabel="Saved spot updates"
            />
          </View>
          <View style={styles.statusCard}>
            <Text style={[styles.statusTitle, saveState === 'error' && styles.errorText]}>{statusTitle}</Text>
            {!!statusBody && <Text style={styles.statusBody}>{statusBody}</Text>}
          </View>
        </View>

        <Text style={styles.section}>Personalization</Text>
        <Row title="Study preferences" subtitle={preferencesSubtitle} onPress={onOpenPreferences} />

        <Text style={styles.section}>Privacy and account</Text>
        <View style={styles.stack}>
          <Row
            title="Location permission"
            subtitle={locationPermission ? LOCATION_SUBTITLES[locationPermission] : 'Manage in device settings'}
            onPress={openAppSettings}
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
  errorText: { color: colors.danger },

  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
})
