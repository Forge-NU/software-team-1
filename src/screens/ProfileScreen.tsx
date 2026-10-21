import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { CheckIn, getMyCheckIns, MAX_NAME_LENGTH, signOut } from '../lib/profile'
import { useProfile } from '../context/ProfileContext'
import TopBar from '../components/TopBar'
import { colors, layout, radius, spacing, typography } from '../theme'

/**
 * Navigation is passed in as callbacks so this screen works with whatever
 * navigator F-1's app shell uses. The bottom tab bar also belongs to F-1.
 */
export interface ProfileScreenProps {
  onOpenSpot: (locationId: number) => void
  onOpenSettings: () => void
  onOpenPreferences: () => void
  onFindSpot: () => void
  onSignedOut: () => void
}

// "Yesterday · 11:56 AM", "Oct 2 · 2:10 PM"
function formatWhen(iso: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === new Date().toDateString()) return `Today · ${time}`
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday · ${time}`
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${time}`
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export default function ProfileScreen({
  onOpenSpot,
  onOpenSettings,
  onOpenPreferences,
  onFindSpot,
  onSignedOut,
}: ProfileScreenProps) {
  const { profile, loading: profileLoading, setDisplayName } = useProfile()
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      setCheckIns(await getMyCheckIns(profile.userId))
      setLoadError(null)
    } catch {
      setLoadError("Couldn't load your updates. Pull down to try again.")
    } finally {
      setLoading(false)
    }
  }, [profile?.userId])

  // TODO(F-1): once navigation exists, also reload when this tab regains focus.
  useEffect(() => {
    load()
  }, [load])

  const startEditing = () => {
    setDraftName(profile?.displayName ?? '')
    setNameError(null)
    setEditing(true)
  }

  const saveName = async () => {
    setSaving(true)
    setNameError(null)
    try {
      await setDisplayName(draftName)
      setEditing(false)
    } catch (e: any) {
      setNameError(e?.message ?? "Couldn't save your name. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const confirmSignOut = () => {
    Alert.alert('Sign out of Spotted?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut()
            onSignedOut()
          } catch {
            Alert.alert("Couldn't sign out", 'Check your connection and try again.')
          }
        },
      },
    ])
  }

  if (profileLoading || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primaryDark} />
      </View>
    )
  }

  const count = checkIns.length
  const statsLine = [
    plural(count, 'update') + ' shared',
    profile.savedCount !== null ? plural(profile.savedCount, 'spot') + ' saved' : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const sinceMonth = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString('en-US', { month: 'long' })
    : null
  const statsBody =
    count === 0
      ? 'Check in at a spot to help campus find a seat.'
      : sinceMonth
        ? `Helping campus find a seat since ${sinceMonth}.`
        : 'Helping campus find a seat.'

  const header = (
    <View>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Feather name="user" size={28} color={colors.textSecondary} />
        </View>

        {editing ? (
          <View style={styles.flex}>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              maxLength={MAX_NAME_LENGTH}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveName}
              style={styles.nameInput}
              accessibilityLabel="Display name"
            />
            {nameError && <Text style={styles.errorText}>{nameError}</Text>}
            <View style={styles.editActions}>
              <Pressable onPress={() => setEditing(false)} disabled={saving} hitSlop={8}>
                <Text style={styles.linkMuted}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveName} disabled={saving} hitSlop={8}>
                <Text style={styles.link}>{saving ? 'Saving…' : 'Save name'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {profile.displayName || 'Add your name'}
              </Text>
              <Pressable
                onPress={startEditing}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Edit name"
              >
                <Feather name="edit-2" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
            {profile.school && <Text style={styles.school}>{profile.school}</Text>}
          </View>
        )}
      </View>

      {profile.email && <Text style={styles.email}>{profile.email}</Text>}

      <View style={[styles.card, styles.statsCard]}>
        <Text style={styles.statsTitle}>{statsLine}</Text>
        <Text style={styles.statsBody}>{statsBody}</Text>
      </View>

      <Text style={styles.sectionTitle}>My past updates</Text>
      {loadError && <Text style={styles.errorText}>{loadError}</Text>}
    </View>
  )

  const empty = loading ? (
    <ActivityIndicator style={styles.spinner} color={colors.primaryDark} />
  ) : loadError ? null : (
    <View style={[styles.card, styles.empty]}>
      <Text style={styles.emptyTitle}>No updates yet</Text>
      <Text style={styles.emptyBody}>
        Check in at a spot to share how busy it is. Your updates will show up here.
      </Text>
      <Pressable style={styles.button} onPress={onFindSpot}>
        <Text style={styles.buttonText}>Find a spot</Text>
      </Pressable>
    </View>
  )

  const footer = (
    <View style={styles.footer}>
      <Pressable style={[styles.card, styles.rowCard]} onPress={onOpenPreferences}>
        <Text style={styles.rowText}>Study preferences</Text>
        <Feather name="chevron-down" size={20} color={colors.textSecondary} />
      </Pressable>
      <Pressable style={[styles.card, styles.rowCard]} onPress={onOpenSettings}>
        <Text style={styles.rowText}>Settings</Text>
        <Feather name="chevron-down" size={20} color={colors.textSecondary} />
      </Pressable>
      <Pressable style={[styles.card, styles.rowCard]} onPress={confirmSignOut}>
        <Text style={[styles.rowText, styles.dangerText]}>Sign out</Text>
      </Pressable>
    </View>
  )

  return (
    <View style={styles.screen}>
      <TopBar title="Profile" />
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.content}
        data={checkIns}
        keyExtractor={(item) => item.postId}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        refreshing={loading && count > 0}
        onRefresh={load}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, styles.updateCard]}
            onPress={() => onOpenSpot(item.locationId)}
            accessibilityRole="button"
          >
            <Text style={styles.updateSpot}>{item.locationName}</Text>
            <Text style={styles.updateWhen}>{formatWhen(item.createdAt)}</Text>
            {item.details.length > 0 && (
              <Text style={styles.updateDetails}>{item.details.join(' · ')}</Text>
            )}
          </Pressable>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  spinner: { marginTop: spacing.xl },
  separator: { height: spacing.sm },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { ...typography.header, flexShrink: 1, color: colors.textPrimary },
  school: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xxs },
  email: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.md },
  nameInput: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.textPrimary,
  },
  editActions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  link: { ...typography.label, color: colors.primaryDark },
  linkMuted: { ...typography.bodySmall, color: colors.textSecondary },
  errorText: { ...typography.caption, color: colors.danger, marginTop: spacing.xxs },
  dangerText: { color: colors.danger },

  statsCard: { padding: spacing.md, marginBottom: spacing.xl },
  statsTitle: { ...typography.heading, color: colors.textPrimary },
  statsBody: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs },

  sectionTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.sm },

  updateCard: { padding: spacing.md },
  updateSpot: { ...typography.bodyStrong, color: colors.textPrimary },
  updateWhen: { ...typography.label, color: colors.textPrimary, marginTop: spacing.xs },
  updateDetails: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },

  empty: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  emptyTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  emptyBody: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xxs },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  buttonText: { ...typography.button, color: colors.surface },

  footer: { marginTop: spacing.xl + spacing.sm, gap: spacing.sm },
  rowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowText: { ...typography.bodyStrong, color: colors.textSecondary },
})
