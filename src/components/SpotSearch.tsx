
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
import {
    Feather,
    MaterialCommunityIcons,
} from '@expo/vector-icons'

import Badge from './Badge'
import { useHeaderOverlap } from '../hooks/useHeaderOverlap'
import {
    getSearchOrigin,
    type SearchOrigin,
    type SpotSummary,
} from '../lib/checkIn'
import { searchLocations } from '../lib/spotSearch'
import { NU_CAMPUS } from '../lib/exploreSource'
import {
    colors,
    layout,
    radius,
    spacing,
    typography,
} from '../theme'

interface SpotSearchProps {
    onSelect: (spot: SpotSummary) => void
    variant?: 'explore' | 'checkIn'
}

// Turn the latest report time into readable text.
function reportedAgo(iso: string): string {
    const timestamp = Date.parse(iso)

    if (!Number.isFinite(timestamp)) {
        return 'No recent updates'
    }

    const minutes = Math.max(
        0,
        Math.floor((Date.now() - timestamp) / 60_000)
    )

    if (minutes < 1) return 'Reported just now'

    if (minutes < 60) {
        return `Reported ${minutes} min ago`
    }

    const hours = Math.floor(minutes / 60)

    if (hours < 24) {
        return `Reported ${hours} hr ago`
    }

    const days = Math.floor(hours / 24)

    return `Reported ${days} day${days === 1 ? '' : 's'} ago`
}

export default function SpotSearch({
    onSelect,
    variant = 'explore',
}: SpotSearchProps) {
    const headerOverlap = useHeaderOverlap()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SpotSummary[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)

    // Use campus coordinates only when location is unavailable.
    // Walking time is hidden when we're using this fallback.
    const [origin, setOrigin] = useState<SearchOrigin>({
        ...NU_CAMPUS,
        isFallback: true,
    })

    // Get the user's location when Search opens.
    useEffect(() => {
        let active = true

        getSearchOrigin()
            .then((position) => {
                if (active) {
                    setOrigin(position)
                }
            })
            .catch((err) => {
                console.warn('Location unavailable:', err)
            })

        return () => {
            active = false
        }
    }, [])

    // Debounce search so we don't search on every keystroke.
    useEffect(() => {
        const text = query.trim()
        let cancelled = false

        if (!text) {
            setResults([])
            setLoading(false)
            setError(null)
            return
        }

        setLoading(true)
        setError(null)
        setResults([])

        const timer = setTimeout(async () => {
            try {
                const spots = await searchLocations(text, origin)

                if (!cancelled) {
                    setResults(spots)
                    setError(null)
                }
            } catch (err) {
                console.error('Spot search failed:', err)

                if (!cancelled) {
                    setResults([])
                    setError(
                        "Couldn't load spots. Check your connection and try again."
                    )
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }, 300)

        // Ignore results from an outdated search.
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [query, origin, retryCount])

    const trimmed = query.trim()

    const placeholder =
        variant === 'checkIn'
            ? 'Where are you checking in?'
            : 'Search spots or buildings'

    // Shared Figma-style search result card.
    const renderSpot = ({ item }: { item: SpotSummary }) => (
        <Pressable
            style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
            ]}
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityLabel={`Select ${item.name}`}
        >
            {/* Spot name and crowding status */}
            <View style={styles.cardHeader}>
                <Text style={styles.spotName}>
                    {item.name}
                </Text>

                {!!item.status && (
                    <Badge
                        label={item.status}
                        tone={item.statusTone}
                    />
                )}
            </View>

            {/* Freshness */}
            <View style={styles.reportRow}>
                <Feather
                    name="clock"
                    size={15}
                    color={colors.textSecondary}
                />

                <Text style={styles.reportText}>
                    {item.reportedAt
                        ? reportedAgo(item.reportedAt)
                        : 'No recent updates'}
                </Text>
            </View>

            {/* Noise, outlets, and walking time */}
            <View style={styles.amenitiesRow}>
                {!!item.noiseLabel && (
                    <View style={styles.amenity}>
                        <Feather
                            name="volume-2"
                            size={15}
                            color={colors.textSecondary}
                        />

                        <Text style={styles.amenityText}>
                            {item.noiseLabel}
                        </Text>
                    </View>
                )}

                {!!item.outlets && (
                    <View style={styles.amenity}>
                        <MaterialCommunityIcons
                            name="power-plug-outline"
                            size={16}
                            color={colors.textSecondary}
                        />

                        <Text style={styles.amenityText}>
                            Outlets
                        </Text>
                    </View>
                )}

                {item.walkMinutes != null && (
                    <View style={styles.amenity}>
                        <Feather
                            name="map-pin"
                            size={15}
                            color={colors.textSecondary}
                        />

                        <Text style={styles.amenityText}>
                            {item.walkMinutes} min walk
                        </Text>
                    </View>
                )}
            </View>
        </Pressable>
    )

    // Empty, loading, error, and no-results states.
    const renderEmpty = () => {
        if (!trimmed) {
            return (
                <View style={styles.emptyState}>
                    {variant === 'checkIn' ? (
                        <Text style={styles.emptyTitle}>
                            Where are you checking in?
                        </Text>
                    ) : (
                        <Text style={styles.emptyTitle}>
                            Find your next spot
                        </Text>
                    )}

                    <Text style={styles.emptyDescription}>
                        Search for a spot or building by name.
                    </Text>
                </View>
            )
        }

        if (loading) {
            return (
                <View style={styles.emptyState}>
                    <ActivityIndicator
                        size="large"
                        color={colors.primaryDark}
                    />

                    <Text style={styles.emptyDescription}>
                        Searching spots...
                    </Text>
                </View>
            )
        }

        if (error) {
            return (
                <View style={styles.emptyState}>
                    <Feather
                        name="wifi-off"
                        size={30}
                        color={colors.textSecondary}
                    />

                    <Text style={styles.emptyTitle}>
                        Search unavailable
                    </Text>

                    <Text style={styles.emptyDescription}>
                        {error}
                    </Text>

                    <Pressable
                        style={styles.retryButton}
                        onPress={() =>
                            setRetryCount((value) => value + 1)
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Try searching again"
                    >
                        <Text style={styles.retryText}>
                            Try again
                        </Text>
                    </Pressable>
                </View>
            )
        }

        return (
            <View style={styles.emptyState}>
                <Feather
                    name="search"
                    size={30}
                    color={colors.textSecondary}
                />

                <Text style={styles.emptyTitle}>
                    No spots found
                </Text>

                <Text style={styles.emptyDescription}>
                    No spots match "{trimmed}". Try another spot or
                    building name.
                </Text>
            </View>
        )
    }

    return (
        // The native stack header shows the title and back button. The search field is
        // pinned, so pad it below the glass header (iOS 26)
        <View style={[styles.screen, { paddingTop: headerOverlap }]}>

            {/* Figma-style search input */}
            <View style={styles.searchContainer}>
                <View style={styles.searchField}>
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder={placeholder}
                        placeholderTextColor={colors.textPlaceholder}
                        autoFocus
                        autoCorrect={false}
                        autoCapitalize="none"
                        returnKeyType="search"
                        style={styles.searchInput}
                        accessibilityLabel="Search spots or buildings"
                    />

                    {query.length > 0 && (
                        <Pressable
                            onPress={() => setQuery('')}
                            hitSlop={10}
                            accessibilityRole="button"
                            accessibilityLabel="Clear search"
                        >
                            <Feather
                                name="x"
                                size={18}
                                color={colors.textSecondary}
                            />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Search results */}
            <FlatList
                data={loading || error ? [] : results}
                keyExtractor={(item) =>
                    `${item.locationId}-${item.seatingId ?? 'location'}`
                }
                renderItem={renderSpot}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.resultsList}
                // Results scroll under the glass tab bar, but the last one can still scroll clear of it
                contentInsetAdjustmentBehavior="automatic"
                ItemSeparatorComponent={() => (
                    <View style={styles.cardSeparator} />
                )}
                ListHeaderComponent={
                    trimmed &&
                        !loading &&
                        !error &&
                        results.length > 0 ? (
                        <Text style={styles.resultsHeading}>
                            Results for "{trimmed}"
                        </Text>
                    ) : undefined
                }
                ListEmptyComponent={renderEmpty}
            />
        </View>
    )
}

// F-11 UI styles based on the Search Figma.
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.surface,
    },

    // Search field
    searchContainer: {
        paddingHorizontal: layout.screenPaddingHorizontal,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },

    searchField: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 46,
        borderWidth: 1,
        borderColor: colors.textPrimary,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
    },

    searchInput: {
        ...typography.body,
        color: colors.textPrimary,
        flex: 1,
        paddingVertical: spacing.sm,
    },

    // Results list
    resultsList: {
        flexGrow: 1,
        paddingHorizontal: layout.screenPaddingHorizontal,
        paddingBottom: spacing.xl,
    },

    resultsHeading: {
        ...typography.heading,
        color: colors.textPrimary,
        marginTop: spacing.md,
        marginBottom: spacing.md,
    },

    // Spot cards
    card: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.xl,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        gap: spacing.xs,

        // Subtle shadow like the Figma cards
        shadowColor: colors.shadow,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.04,
        shadowRadius: 5,
        elevation: 1,
    },

    cardPressed: {
        opacity: 0.75,
        backgroundColor: colors.background,
    },

    cardSeparator: {
        height: spacing.sm,
    },

    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },

    spotName: {
        ...typography.bodyStrong,
        color: colors.textPrimary,
        flex: 1,
        flexShrink: 1,
    },

    // Report time
    reportRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },

    reportText: {
        ...typography.caption,
        color: colors.textSecondary,
    },

    // Noise, outlets, and walking time
    amenitiesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        columnGap: spacing.md,
        rowGap: spacing.xs,
    },

    amenity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xxs,
    },

    amenityText: {
        ...typography.caption,
        color: colors.textSecondary,
    },

    // Empty and error states
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: 56,
        gap: spacing.sm,
    },

    emptyTitle: {
        ...typography.heading,
        color: colors.textPrimary,
        textAlign: 'center',
    },

    emptyDescription: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
    },

    retryButton: {
        backgroundColor: colors.primaryLight,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        marginTop: spacing.sm,
    },

    retryText: {
        ...typography.bodyStrong,
        color: colors.primaryDark,
    },
})
