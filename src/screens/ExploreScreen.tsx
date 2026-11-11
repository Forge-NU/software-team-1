import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { colors, spacing, radius, typography, layout } from '../theme';

import MapViewComponent from '../components/MapView';

import { getUnsupportedLabels, useFilters } from '../context/FiltersContext';
import { toExploreFilters } from '../lib/filterAdapter';
import { getExploreSpots, NU_CAMPUS } from '../lib/exploreSource';
import type { ExploreSpot } from '../lib/explore';

type ExploreScreenProps = {
    onOpenFilters?: () => void;
    onOpenSpot?: (locationId: number) => void;
    latitude?: number;
    longitude?: number;
};

/** Height of the map on the Explore screen, from the Figma */
const MAP_HEIGHT = 220;

// Readable names for database location types
const typeLabels: Record<string, string> = {
    library: 'Library',
    cafe: 'Café',
    campus_building: 'Campus building',
    coworking: 'Coworking',
    restaurant: 'Restaurant',
    park: 'Park',
    other: 'Other',
};

// Roughly 80 meters per minute of walking
function walkTime(meters: number): string {
    const minutes = Math.max(1, Math.round(meters / 80));
    return `${minutes} min walk`;
}

function updatedAgo(iso: string | null): string {
    if (!iso) return 'No updates yet';
    const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
    if (minutes < 1) return 'Updated just now';
    if (minutes < 60) return `Updated ${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `Updated ${hours} h ago`;
    const days = Math.round(hours / 24);
    return `Updated ${days} ${days === 1 ? 'day' : 'days'} ago`;
}

export default function ExploreScreen({
    onOpenFilters,
    onOpenSpot,
    latitude = NU_CAMPUS.latitude,
    longitude = NU_CAMPUS.longitude,
}: ExploreScreenProps) {
    // Shared filters: the same ones the Filters screen edits
    const { filters, activeChips, removeChip, clearAll } = useFilters();

    const [spots, setSpots] = useState<ExploreSpot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const unsupported = getUnsupportedLabels(filters);

    // Reloads results whenever filters change (including chip removal)
    useEffect(() => {
        let cancelled = false;

        setLoading(true);
        setError(null);

        getExploreSpots({
            latitude,
            longitude,
            filters: toExploreFilters(filters),
        })
            .then((results) => {
                if (!cancelled) setSpots(results);
            })
            .catch((err) => {
                console.error('Explore: failed to load spots', err);
                if (!cancelled) {
                    setSpots([]);
                    setError('Spots could not be loaded. Check your connection and try again.');
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [filters, latitude, longitude]);

    // Each card opens that spot's detail page when tapped
    const renderSpot = ({ item }: { item: ExploreSpot }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onOpenSpot?.(item.location_id)}
            accessibilityRole="link"
            accessibilityLabel={`Open ${item.name}`}
        >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>
                {typeLabels[item.location_type] ?? item.location_type}, {walkTime(item.distance_meters)}
            </Text>

            {item.is_current ? (
                <Text style={styles.cardStatus}>
                    {item.crowd_level}
                    {item.noise_level ? `, ${item.noise_level.toLowerCase()}` : ''}
                </Text>
            ) : (
                <Text style={styles.cardStale}>No recent updates</Text>
            )}

            <Text style={styles.cardUpdated}>{updatedAgo(item.last_updated_at)}</Text>
        </TouchableOpacity>
    );

    const renderEmpty = () => {
        if (loading) return null;

        if (error) {
            return <Text style={styles.warning}>{error}</Text>;
        }

        if (activeChips.length > 0) {
            return (
                <View style={styles.empty}>
                    <Text style={styles.emptyTitle}>No spots match these filters</Text>
                    <Text style={styles.emptyText}>
                        Remove a filter above, or clear them all to see every spot nearby.
                    </Text>
                    <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={clearAll}
                        accessibilityRole="button"
                    >
                        <Text style={styles.emptyButtonText}>Clear filters</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No spots nearby yet</Text>
                <Text style={styles.emptyText}>
                    Spots appear here once they're added to Spotted.
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.logo}>Spotted</Text>
            </View>

            {/* Map of the spots matching the current filters */}
            <View style={styles.mapArea}>
                <MapViewComponent
                    height={MAP_HEIGHT}
                    locations={spots}
                    onLocationPress={(spot) => onOpenSpot?.(spot.location_id)}
                />
            </View>

            {/* Filters button and active filter chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipRow}
                contentContainerStyle={styles.chipRowContent}
            >
                <TouchableOpacity
                    style={styles.filtersButton}
                    onPress={onOpenFilters}
                    accessibilityRole="button"
                >
                    <Text style={styles.filtersButtonText}>
                        Filters{activeChips.length > 0 ? ` (${activeChips.length})` : ''}
                    </Text>
                </TouchableOpacity>

                {activeChips.map((chip) => (
                    <TouchableOpacity
                        key={chip.key}
                        style={styles.activeChip}
                        onPress={() => removeChip(chip.key)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${chip.label} filter`}
                    >
                        <Text style={styles.activeChipText}>✓ {chip.label} ×</Text>
                    </TouchableOpacity>
                ))}

                {activeChips.length > 1 && (
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={clearAll}
                        accessibilityRole="button"
                    >
                        <Text style={styles.clearButtonText}>Clear all</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Filters B-5 can't apply yet */}
            {unsupported.length > 0 && (
                <Text style={styles.notice}>
                    Not applied yet: {unsupported.join(', ')}
                </Text>
            )}

            {loading && (
                <ActivityIndicator color={colors.primaryDark} style={styles.spinner} />
            )}

            {/* Results */}
            <FlatList
                data={loading ? [] : spots}
                keyExtractor={(item) => String(item.location_id)}
                renderItem={renderSpot}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    );
}

// Styles using Spotted's shared theme
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
        height: layout.headerHeight,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        paddingHorizontal: layout.screenPaddingHorizontal,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    logo: { ...typography.bodyStrong, color: colors.primary },

    mapArea: {
        paddingHorizontal: layout.screenPaddingHorizontal,
        paddingTop: spacing.md,
    },

    chipRow: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
    chipRowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: layout.screenPaddingHorizontal,
        paddingVertical: spacing.sm,
    },

    filtersButton: {
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    filtersButtonText: { ...typography.captionStrong, color: colors.textPrimary },

    activeChip: {
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        backgroundColor: colors.primaryLight,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    activeChipText: { ...typography.tag, color: colors.textOnPrimaryLight },

    clearButton: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    clearButtonText: { ...typography.captionStrong, color: colors.primaryDark },

    notice: {
        ...typography.caption,
        color: colors.textSecondary,
        paddingHorizontal: layout.screenPaddingHorizontal,
        paddingTop: spacing.sm,
    },

    spinner: { marginTop: spacing.lg },

    list: { padding: layout.screenPaddingHorizontal, gap: spacing.sm, flexGrow: 1 },

    card: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.md,
    },
    cardTitle: { ...typography.bodyStrong, color: colors.textPrimary },
    cardMeta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
    cardStatus: { ...typography.bodySmall, color: colors.textPrimary, marginTop: spacing.sm },
    cardStale: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.sm },
    cardUpdated: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },

    empty: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
    emptyTitle: { ...typography.bodyStrong, color: colors.textPrimary, textAlign: 'center' },
    emptyText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.xs,
    },
    emptyButton: {
        marginTop: spacing.md,
        backgroundColor: colors.primary,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    emptyButtonText: { ...typography.bodyStrong, color: colors.textPrimary },

    warning: {
        ...typography.caption,
        color: colors.danger,
        textAlign: 'center',
        paddingVertical: spacing.lg,
    },
});