import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { searchSpots, SpotSummary } from '../../lib/checkIn'
import FlowHeader from '../../components/FlowHeader'
import Badge from '../../components/Badge'
import { colors, layout, radius, spacing, typography } from '../../theme'

interface SearchStepProps {
  onPick: (spot: SpotSummary) => void
  onCancel: () => void
}

function reportedAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'Reported just now'
  if (mins < 60) return `Reported ${mins} min ago`
  return `Reported ${Math.round(mins / 60)} hr ago`
}

export default function SearchStep({ onPick, onCancel }: SearchStepProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotSummary[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce so we don't search on every keystroke.
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setError(null)
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        setResults(await searchSpots(query))
        setError(null)
      } catch {
        setError("Couldn't search right now. Check your connection and try again.")
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  const trimmed = query.trim()

  return (
    <View style={styles.screen}>
      <FlowHeader title="Search" onBack={onCancel} onCancel={onCancel} />

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Where are you checking in?"
          placeholderTextColor={colors.textSecondary}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
          accessibilityLabel="Search for a spot"
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.seatingId)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          trimmed ? (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Results for “{trimmed}”</Text>
              {searching && <ActivityIndicator size="small" color={colors.primaryDark} />}
            </View>
          ) : null
        }
        ListEmptyComponent={
          trimmed && !searching ? (
            <Text style={styles.emptyText}>
              {error ?? `No spots match “${trimmed}”. Try a building name like Snell or Curry.`}
            </Text>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => onPick(item)}
            accessibilityRole="button"
            accessibilityLabel={`Check in at ${item.name}`}
          >
            <View style={styles.cardTop}>
              <Text style={styles.spotName}>{item.name}</Text>
              {!!item.status && <Badge label={item.status} tone={item.statusTone} />}
            </View>

            {!!item.reportedAt && (
              <View style={styles.metaRow}>
                <Feather name="clock" size={15} color={colors.textSecondary} />
                <Text style={styles.meta}>{reportedAgo(item.reportedAt)}</Text>
              </View>
            )}

            {(!!item.noiseLabel || !!item.outlets || item.walkMinutes != null) && (
              <View style={styles.metaRow}>
                {!!item.noiseLabel && (
                  <View style={styles.metaItem}>
                    <Feather
                      name={item.noiseLabel === 'Quiet' ? 'volume-x' : 'users'}
                      size={15}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.meta}>{item.noiseLabel}</Text>
                  </View>
                )}
                {!!item.outlets && (
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="power-plug-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.meta}>Outlets</Text>
                  </View>
                )}
                {item.walkMinutes != null && (
                  <View style={styles.metaItem}>
                    <Feather name="map-pin" size={15} color={colors.textSecondary} />
                    <Text style={styles.meta}>{item.walkMinutes} min walk</Text>
                  </View>
                )}
              </View>
            )}
          </Pressable>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  searchWrap: { paddingHorizontal: layout.screenPaddingHorizontal, paddingTop: spacing.md },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.textPrimary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  list: { paddingHorizontal: layout.screenPaddingHorizontal, paddingBottom: spacing.xl },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  resultsTitle: { ...typography.heading, color: colors.textPrimary },
  emptyText: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs },
  separator: { height: spacing.sm },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pressed: { opacity: 0.8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  spotName: { ...typography.heading, color: colors.textPrimary, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs + 2 },
  meta: { ...typography.caption, color: colors.textSecondary },
})
