import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Feather } from '@expo/vector-icons';
import {
    BackHandler,
    Keyboard,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetTextInput } from '@gorhom/bottom-sheet';
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
import SheetFilterButton from '../components/SheetFilterButton';
import SheetScrollArea from '../components/SheetScrollArea';
import { SpotSearchResult, SpotSearchStatus, useSpotSearch } from '../components/SpotSearch';
import { EXPLORE_SORT } from '../constants/explore';

import { getUnsupportedLabels, useFilters } from '../context/FiltersContext';
import { hasActiveFilters, useExploreSpots } from '../hooks/useExploreSpots';
import { toExploreFilters } from '../lib/filterAdapter';
import { NU_CAMPUS } from '../lib/exploreSource';

type ExploreScreenProps = {
    onOpenFilters: () => void;
    onOpenSpot: (locationId: number) => void;
    latitude?: number;
    longitude?: number;
};

const DEFAULT_SNAP = 1;
const FULL_SNAP = 2;

/**
 * The header is gorhom's handle, so dragging anywhere on it moves the sheet. The handle component
 * must stay the same between renders (a new one drops the search field's focus), so the header
 * comes from context.
 */
const SheetHeaderContext = createContext<{ header: ReactNode; onLayout: (e: LayoutChangeEvent) => void } | null>(null);

function SheetHandle() {
    const value = useContext(SheetHeaderContext);
    return (
        <View onLayout={value?.onLayout}>
            <View style={styles.grabber} />
            {value?.header}
        </View>
    );
}

export default function ExploreScreen({
    onOpenSpot,
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

    const [screenHeight, setScreenHeight] = useState(0);
    const [headerHeight, setHeaderHeight] = useState(0);
    const handleHeaderLayout = useCallback((e: LayoutChangeEvent) => setHeaderHeight(e.nativeEvent.layout.height), []);
    // Search stays open (Cancel, results) until Cancel; the sheet is only locked while focused
    const [searchActive, setSearchActive] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);

    // iOS screens run under the glass tab bar (included in the safe area); Android's end above it
    const tabBarOverlap = Platform.OS === 'ios' ? insets.bottom : 0;

    // Fade the list out at the smallest height, so it doesn't show through the tab bar
    const animatedIndex = useSharedValue(DEFAULT_SNAP);
    const listFade = useAnimatedStyle(() => ({
        opacity: interpolate(animatedIndex.value, [0, 0.6], [0, 1], Extrapolation.CLAMP),
    }));

    // Just the header (above the tab bar), half, and full
    const snapPoints = useMemo(
        () => [Math.max(headerHeight + tabBarOverlap, 120), '50%', '100%'],
        [headerHeight, tabBarOverlap],
    );

    // Map area covered by the sheet, capped at half the screen
    const sheetPosition = useSharedValue(0);
    const sheetCover = useDerivedValue(() => {
        // Before layout: gorhom's '50%' is measured below topInset
        if (sheetPosition.value <= 0) return (screenHeight - insets.top) * 0.5;
        return Math.min(screenHeight - sheetPosition.value, screenHeight * 0.5);
    });
    const handleSheetChange = (index: number) => {
        snapIndex.current = index;
    };

    // F-11: Search
    const [query, setQuery] = useState('');
    const trimmedQuery = query.trim();
    const showingResults = searchActive && trimmedQuery.length > 0;
    const search = useSpotSearch(query, searchActive);
    const snapBeforeSearch = useRef(DEFAULT_SNAP);

    const startSearch = () => {
        if (!searchActive) {
            snapBeforeSearch.current = snapIndex.current;
            setSearchActive(true);
        }
        setSearchFocused(true);
        sheet.current?.snapToIndex(FULL_SNAP);
    };

    const cancelSearch = useCallback(() => {
        const index = snapBeforeSearch.current;
        // gorhom moves the sheet as the keyboard closes, which would undo this, so wait for it
        if (Keyboard.isVisible()) {
            const sub = Keyboard.addListener('keyboardDidHide', () => {
                sub.remove();
                sheet.current?.snapToIndex(index);
            });
        } else {
            sheet.current?.snapToIndex(index);
        }
        // Also blurs the field with a hardware keyboard
        Keyboard.dismiss();
        setQuery('');
        setSearchActive(false);
        setSearchFocused(false);
    }, []);

    // Android back: leaves search, then shrinks the sheet, then leaves
    useFocusEffect(
        useCallback(() => {
            const sub = BackHandler.addEventListener('hardwareBackPress', () => {
                if (searchActive) {
                    cancelSearch();
                    return true;
                }
                if (snapIndex.current <= 0) return false;
                sheet.current?.snapToIndex(0);
                return true;
            });
            return () => sub.remove();
        }, [searchActive, cancelSearch]),
    );

    const filtersActive = activeChips.length > 0;

    const header = (
        <View style={styles.header}>
            <View style={styles.searchRow}>
                <View style={styles.searchField}>
                    <Feather name="search" size={20} color={colors.textSecondary} />
                    <BottomSheetTextInput
                        value={query}
                        onChangeText={setQuery}
                        onFocus={startSearch}
                        onBlur={() => setSearchFocused(false)}
                        placeholder="Search spots or buildings"
                        placeholderTextColor={colors.textSecondary}
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
                            <Feather name="x-circle" size={18} color={colors.textSecondary} />
                        </Pressable>
                    )}
                </View>

                {searchActive ? (
                    <Pressable
                        onPress={cancelSearch}
                        hitSlop={8}
                        style={styles.cancelButton}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel search"
                    >
                        <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                ) : (
                    <SheetFilterButton activeCount={activeChips.length} onPress={onOpenFilters} />
                )}
            </View>

            {/* Filters don't apply to search results */}
            {filtersActive && !showingResults && (
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
                            {/* Icon, since "×" sits low in this font */}
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
            <MapViewComponent
                height="100%"
                rounded={false}
                insets={{ top: insets.top, bottom: sheetCover }}
                locations={spots}
                onLocationPress={(spot) => onOpenSpot(spot.location_id)}
            />

            {screenHeight > 0 && (
                <SheetHeaderContext.Provider value={{ header, onLayout: handleHeaderLayout }}>
                    <BottomSheet
                        ref={sheet}
                        index={DEFAULT_SNAP}
                        snapPoints={snapPoints}
                        enableDynamicSizing={false}
                        enablePanDownToClose={false}
                        topInset={insets.top}
                        onChange={handleSheetChange}
                        // Content drags are handled by SheetScrollArea
                        handleComponent={SheetHandle}
                        enableHandlePanningGesture={!searchFocused}
                        enableContentPanningGesture={false}
                        // Let sideways swipes scroll the filter chips
                        activeOffsetY={[-6, 6]}
                        failOffsetX={[-12, 12]}
                        keyboardBehavior="extend"
                        keyboardBlurBehavior="none"
                        android_keyboardInputMode="adjustResize"
                        animatedIndex={animatedIndex}
                        animatedPosition={sheetPosition}
                        backgroundStyle={styles.sheetBackground}
                        style={styles.sheetShadow}
                    >
                        <Animated.View style={[styles.listArea, listFade]}>
                            <SheetScrollArea
                                animatedIndex={animatedIndex}
                                maxIndex={FULL_SNAP}
                                sheetDragEnabled={!searchFocused}
                                contentContainerStyle={[styles.list, { paddingBottom: spacing.xl + tabBarOverlap }]}
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode="on-drag"
                            >
                                {showingResults ? (
                                    <View style={styles.searchResults}>
                                        {!search.loading && !search.error && search.results.map((spot) => (
                                            <SpotSearchResult
                                                key={`${spot.locationId}-${spot.seatingId ?? 'location'}`}
                                                spot={spot}
                                                onPress={(picked) => onOpenSpot(picked.locationId)}
                                            />
                                        ))}
                                        <SpotSearchStatus
                                            query={trimmedQuery}
                                            loading={search.loading}
                                            error={search.error}
                                            onRetry={search.retry}
                                            hasResults={search.results.length > 0}
                                        />
                                    </View>
                                ) : (
                                    <>
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
                                    </>
                                )}
                            </SheetScrollArea>
                        </Animated.View>
                    </BottomSheet>
                </SheetHeaderContext.Provider>
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

    // Matches gorhom's default handle
    grabber: {
        alignSelf: 'center',
        width: 36,
        height: 4,
        borderRadius: 2,
        marginTop: 10,
        marginBottom: 10,
        backgroundColor: colors.textPlaceholder,
    },

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
    searchField: {
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

    searchInput: {
        ...typography.body,
        flex: 1,
        color: colors.textPrimary,
        paddingVertical: 0,
    },

    cancelButton: {
        height: FILTER_BUTTON_SIZE,
        justifyContent: 'center',
        paddingHorizontal: spacing.xxs,
    },

    cancelText: {
        ...typography.bodyStrong,
        color: colors.primaryDark,
    },

    searchResults: { gap: spacing.sm },

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
        // tag's lineHeight is shorter than Afacad's glyphs, which pushes them above the X icon
        lineHeight: 16,
        // Afacad also sits a little high on iOS
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
