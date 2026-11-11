
import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
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

import { ExploreSpotList } from '../components/ExploreSpotList';
import MapViewComponent from '../components/MapView';
import { EXPLORE_SORT } from '../constants/explore';

import { getUnsupportedLabels, useFilters } from '../context/FiltersContext';
import { hasActiveFilters, useExploreSpots } from '../hooks/useExploreSpots';
import { toExploreFilters } from '../lib/filterAdapter';
import { NU_CAMPUS } from '../lib/exploreSource';

type ExploreScreenProps = {
    onOpenFilters?: () => void;
    onOpenSearch?: () => void;
    onOpenSpot: (locationId: number) => void;
    latitude?: number;
    longitude?: number;
};

/** Height of the map on the Explore screen, from the Figma */
const MAP_HEIGHT = 220;

export default function ExploreScreen({
    onOpenFilters,
    onOpenSpot,
    onOpenSearch,
    latitude = NU_CAMPUS.latitude,
    longitude = NU_CAMPUS.longitude,
}: ExploreScreenProps) {
    // Shared filters: the same ones the Filters screen edits
    const { filters, activeChips, removeChip, clearAll } = useFilters();
    const exploreFilters = toExploreFilters(filters);
    const unsupported = getUnsupportedLabels(filters);

    // One fetch for the whole screen: the map and the list both render these `spots`.
    // Refetches when filters change (including chip removal).
    const { spots, loading, error, refresh } = useExploreSpots({
        filters: exploreFilters,
        sort: EXPLORE_SORT,
        latitude,
        longitude,
    });

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.logo}>Spotted</Text>
            </View>

            {/* F-11: Search bar */}
            <TouchableOpacity
                style={styles.searchButton}
                onPress={onOpenSearch}
                accessibilityRole="button"
                accessibilityLabel="Search spots or buildings"
            >
                <Feather
                    name="search"
                    size={20}
                    color={colors.textSecondary}
                />

                <Text style={styles.searchPlaceholder}>
                    Search spots or buildings
                </Text>
            </TouchableOpacity>

            {/* Map of the spots matching the current filters */}
            <View style={styles.mapArea}>
                <MapViewComponent
                    height={MAP_HEIGHT}
                    locations={spots}
                    onLocationPress={(spot) => onOpenSpot(spot.location_id)}
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
                        Filters
                        {activeChips.length > 0
                            ? ` (${activeChips.length})`
                            : ''}
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
                        <Text style={styles.activeChipText}>
                            ✓ {chip.label} ×
                        </Text>
                    </TouchableOpacity>
                ))}

                {activeChips.length > 1 && (
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={clearAll}
                        accessibilityRole="button"
                    >
                        <Text style={styles.clearButtonText}>
                            Clear all
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Filters B-5 can't apply yet */}
            {unsupported.length > 0 && (
                <Text style={styles.notice}>
                    Not applied yet: {unsupported.join(', ')}
                </Text>
            )}

            {/* Results (F-3): ranked SpotCards, with loading, error and empty states */}
            <ScrollView contentContainerStyle={styles.list}>
                <ExploreSpotList
                    spots={spots}
                    loading={loading}
                    error={error}
                    // Only filters B-5 actually applies; unsupported ones don't narrow the list
                    filtered={hasActiveFilters(exploreFilters)}
                    onOpenSpot={onOpenSpot}
                    onRetry={refresh}
                    onClearFilters={clearAll}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

// Styles using Spotted's shared theme
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    header: {
        height: layout.headerHeight,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        paddingHorizontal: layout.screenPaddingHorizontal,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },

    logo: {
        ...typography.bodyStrong,
        color: colors.primary,
    },

    // F-11 search styles
    searchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        marginHorizontal: layout.screenPaddingHorizontal,
        marginTop: spacing.md,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 48,
    },

    searchPlaceholder: {
        ...typography.body,
        color: colors.textSecondary,
    },

    mapArea: {
        paddingHorizontal: layout.screenPaddingHorizontal,
        paddingTop: spacing.md,
    },

    mapPlaceholderText: {
        ...typography.caption,
        color: colors.textSecondary,
    },

    chipRow: {
        flexGrow: 0,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },

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

    filtersButtonText: {
        ...typography.captionStrong,
        color: colors.textPrimary,
    },

    activeChip: {
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        backgroundColor: colors.primaryLight,
        borderWidth: 1,
        borderColor: colors.primary,
    },

    activeChipText: {
        ...typography.tag,
        color: colors.textOnPrimaryLight,
    },

    clearButton: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },

    clearButtonText: {
        ...typography.captionStrong,
        color: colors.primaryDark,
    },

    notice: {
        ...typography.caption,
        color: colors.textSecondary,
        paddingHorizontal: layout.screenPaddingHorizontal,
        paddingTop: spacing.sm,
    },

    list: { padding: layout.screenPaddingHorizontal, flexGrow: 1 },
});
