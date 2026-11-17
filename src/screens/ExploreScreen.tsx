import { useCallback, useMemo, useRef, useState } from 'react';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
    BackHandler,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useFocusEffect } from 'expo-router';
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
} from 'react-native-reanimated';

import { colors, spacing, radius, typography, layout } from '../theme';

import { ExploreSpotList } from '../components/ExploreSpotList';
import MapViewComponent from '../components/MapView';
import { EXPLORE_SORT } from '../constants/explore';

import { getUnsupportedLabels, useFilters } from '../context/FiltersContext';
import { hasActiveFilters, useExploreSpots } from '../hooks/useExploreSpots';
import { toExploreFilters } from '../lib/filterAdapter';
import { NU_CAMPUS } from '../lib/exploreSource';

type ExploreScreenProps = {
    onOpenSearch?: () => void;
    onOpenFilters?: () => void;
    onOpenSpot: (locationId: number) => void;
    latitude?: number;
    longitude?: number;
};

/** The sheet starts at its middle height: half the screen, showing the first few spots */
const DEFAULT_SNAP = 1;
/** Height of the sheet's drag handle area (gorhom's default handle) */
const HANDLE_HEIGHT = 24;

export default function ExploreScreen({
    onOpenSpot,
    onOpenSearch,
    onOpenFilters,
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

    const insets = useSafeAreaInsets();
    const sheet = useRef<BottomSheet>(null);
    const snapIndex = useRef(DEFAULT_SNAP);

    // The screen's height, and the sheet header's, both measured on layout
    const [screenHeight, setScreenHeight] = useState(0);
    const [headerHeight, setHeaderHeight] = useState(0);

    // How far the tab bar covers the bottom of the screen. On iOS the screen runs under the glass
    // tab bar, so the sheet does too and needs room for it; each tab's safe area includes the tab
    // bar there. On Android the screen already ends above the tab bar.
    const tabBarOverlap = Platform.OS === 'ios' ? insets.bottom : 0;

    // The list fades out as the sheet shrinks to its smallest height, so only the search bar
    // shows above the tab bar instead of the list peeking through the glass
    const animatedIndex = useSharedValue(DEFAULT_SNAP);
    const listFade = useAnimatedStyle(() => ({
        opacity: interpolate(animatedIndex.value, [0, 0.6], [0, 1], Extrapolation.CLAMP),
    }));

    // Sheet heights, smallest first:
    // - just the header (search, Filters and chips) above the tab bar, so most of the map shows
    // - half the screen, the default, with the first few spots
    // - full height, for browsing the list (stops below the status bar via topInset)
    const snapPoints = useMemo(
        () => [Math.max(HANDLE_HEIGHT + headerHeight + tabBarOverlap, 120), '50%', '100%'],
        [headerHeight, tabBarOverlap],
    );

    // How much of the map the sheet covers, live while it's dragged, so the map keeps its logo and
    // credit just above it. gorhom's animatedPosition is the sheet's top, measured from the top of the
    // screen. Capped at half the screen: past that there's little map left to keep things in.
    const sheetPosition = useSharedValue(0);
    const sheetCover = useDerivedValue(() => {
        // Before the sheet lays out: its default '50%' height, which gorhom takes from below topInset
        if (sheetPosition.value <= 0) return (screenHeight - insets.top) * 0.5;
        return Math.min(screenHeight - sheetPosition.value, screenHeight * 0.5);
    });
    const handleSheetChange = (index: number) => {
        snapIndex.current = index;
    };

    // Android back first shrinks an expanded sheet, then leaves as usual
    useFocusEffect(
        useCallback(() => {
            const sub = BackHandler.addEventListener('hardwareBackPress', () => {
                if (snapIndex.current <= 0) return false;
                sheet.current?.snapToIndex(0);
                return true;
            });
            return () => sub.remove();
        }, []),
    );

    const filtersActive = activeChips.length > 0;

    const header = (
        <View style={styles.header} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
            <View style={styles.searchRow}>
                {/* F-11: Search bar */}
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={onOpenSearch}
                    accessibilityRole="button"
                    accessibilityLabel="Search spots or buildings"
                >
                    <Feather name="search" size={20} color={colors.textSecondary} />
                    <Text style={styles.searchPlaceholder}>Search spots or buildings</Text>
                </TouchableOpacity>

                {/* Filters: opens the Filters sheet */}
                <Pressable
                    style={[styles.filterButton, filtersActive && styles.filterButtonActive]}
                    onPress={onOpenFilters}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel={filtersActive ? `Filters, ${activeChips.length} active` : 'Filters'}
                    android_ripple={{ color: colors.border, borderless: true, radius: 24 }}
                >
                    {Platform.OS === 'ios' ? (
                        <Ionicons name="filter" size={20} color={filtersActive ? colors.primaryDark : colors.textPrimary} />
                    ) : (
                        <MaterialIcons name="filter-list" size={22} color={filtersActive ? colors.primaryDark : colors.textPrimary} />
                    )}
                    {filtersActive && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{activeChips.length}</Text>
                        </View>
                    )}
                </Pressable>
            </View>

            {/* Active filter chips */}
            {filtersActive && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipRow}
                    contentContainerStyle={styles.chipRowContent}
                >
                    {activeChips.map((chip) => (
                        <TouchableOpacity
                            key={chip.key}
                            style={styles.activeChip}
                            onPress={() => removeChip(chip.key)}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${chip.label} filter`}
                        >
                            <Text style={styles.activeChipText}>{chip.label}</Text>
                            {/* An icon rather than a "×" character, which sits low in this font */}
                            <Feather name="x" size={12} color={colors.textOnPrimaryLight} />
                        </TouchableOpacity>
                    ))}

                    {activeChips.length > 1 && (
                        <TouchableOpacity style={styles.clearButton} onPress={clearAll} accessibilityRole="button">
                            <Text style={styles.clearButtonText}>Clear all</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            )}
        </View>
    );

    return (
        <View style={styles.container} onLayout={(e) => setScreenHeight(e.nativeEvent.layout.height)}>
            {/* Map of the spots matching the current filters, behind everything */}
            <MapViewComponent
                height="100%"
                rounded={false}
                insets={{ top: insets.top, bottom: sheetCover }}
                locations={spots}
                onLocationPress={(spot) => onOpenSpot(spot.location_id)}
            />

            {/* Results sheet, like Apple Maps / Google Maps. It's part of this screen, so it sits above
                the tab bar, can't be swiped away, and leaves the map usable behind it. */}
            {screenHeight > 0 && (
                <BottomSheet
                    ref={sheet}
                    index={DEFAULT_SNAP}
                    snapPoints={snapPoints}
                    enableDynamicSizing={false}
                    enablePanDownToClose={false}
                    topInset={insets.top}
                    onChange={handleSheetChange}
                    animatedIndex={animatedIndex}
                    animatedPosition={sheetPosition}
                    backgroundStyle={styles.sheetBackground}
                    handleIndicatorStyle={styles.handleIndicator}
                    style={styles.sheetShadow}
                >
                    {header}
                    <Animated.View style={[styles.listArea, listFade]}>
                        <BottomSheetScrollView
                            contentContainerStyle={[styles.list, { paddingBottom: spacing.xl + tabBarOverlap }]}
                        >
                            {/* Filters B-5 can't apply yet */}
                            {unsupported.length > 0 && (
                                <Text style={styles.notice}>Not applied yet: {unsupported.join(', ')}</Text>
                            )}

                            {/* Results (F-3): ranked SpotCards, with loading, error and empty states */}
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
                        </BottomSheetScrollView>
                    </Animated.View>
                </BottomSheet>
            )}
        </View>
    );
}

const FILTER_BUTTON_SIZE = 48;

// Styles using Spotted's shared theme
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    sheetBackground: {
        backgroundColor: colors.background,
        borderTopLeftRadius: radius.xxl,
        borderTopRightRadius: radius.xxl,
    },

    sheetShadow: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 12,
    },

    listArea: { flex: 1 },

    handleIndicator: { backgroundColor: colors.textPlaceholder, width: 36 },

    // Sheet header: stays put while the list scrolls. Also sets the smallest sheet height.
    header: {
        paddingTop: spacing.xxs,
        paddingBottom: spacing.sm,
        gap: spacing.sm,
    },

    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: layout.screenPaddingHorizontal,
    },

    // F-11 search styles
    searchButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: FILTER_BUTTON_SIZE,
    },

    searchPlaceholder: {
        ...typography.body,
        color: colors.textSecondary,
    },

    filterButton: {
        width: FILTER_BUTTON_SIZE,
        height: FILTER_BUTTON_SIZE,
        borderRadius: FILTER_BUTTON_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },

    filterButtonActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },

    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: 9,
        backgroundColor: colors.primaryDark,
        alignItems: 'center',
        justifyContent: 'center',
    },

    badgeText: { ...typography.caption, fontSize: 11, lineHeight: 13, color: colors.textOnPrimary },

    chipRow: {
        flexGrow: 0,
    },

    chipRowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: layout.screenPaddingHorizontal,
    },

    activeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xxs,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        backgroundColor: colors.primaryLight,
        borderWidth: 1,
        borderColor: colors.primary,
    },

    activeChipText: {
        ...typography.tag,
        // tag's lineHeight equals its fontSize, which is shorter than Afacad's glyph box, so the
        // letters get pushed to the top of the line and sit above the centered X icon
        lineHeight: 16,
        // Afacad's letters also sit a little high in their line on iOS; nudge them down to center
        ...Platform.select({ ios: { transform: [{ translateY: 1 }] }, default: {} }),
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
        paddingBottom: spacing.sm,
    },

    list: {
        paddingHorizontal: layout.screenPaddingHorizontal,
        paddingTop: spacing.xs,
        paddingBottom: spacing.xl,
    },
});
