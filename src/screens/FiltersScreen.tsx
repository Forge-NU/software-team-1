
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    colors,
    spacing,
    radius,
    typography,
    layout,
} from '../theme';

import { exploreSpots } from '../lib/explore';
import { toExploreFilters } from '../lib/filterAdapter';

// All selections from the Filters screen
export type Filters = {
    atmosphere: string | null;
    locationTypes: string[];
    amenities: string[];
    priceRangeIds: number[];

    // Future exact-dollar price option
    minPrice: number | null;
    maxPrice: number | null;

    accessible: boolean;
};

// Nothing selected by default
export const emptyFilters: Filters = {
    atmosphere: null,
    locationTypes: [],
    amenities: [],
    priceRangeIds: [],
    minPrice: null,
    maxPrice: null,
    accessible: false,
};

type FiltersScreenProps = {
    initialFilters?: Filters;

    // Called immediately whenever filters change
    onFiltersChange?: (filters: Filters) => void;

    // Called when Show Results is pressed
    onApply?: (filters: Filters) => void;

    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
};

const noiseOptions = [
    'Any noise level',
    'Quiet',
    'Social / conversation OK',
];

const locationOptions = [
    'Campus',
    'Library',
    'Café',
    'Public Space',
];

const amenityOptions = [
    'Outlets',
    'Wi-Fi',
    'Food & Drinks',
    'Restrooms',
];

const priceOptions = [
    { id: 0, label: 'Free' },
    { id: 1, label: '$' },
    { id: 2, label: '$$' },
    { id: 3, label: '$$$' },
    { id: 4, label: '$$$$' },
];

// B-5 does not support all the original UI choices
function hasUnsupportedFilters(filters: Filters): boolean {
    return (
        filters.atmosphere === 'Social / conversation OK' ||
        filters.amenities.some(
            (amenity: string) => amenity !== 'Outlets'
        ) ||
        filters.accessible ||
        filters.minPrice !== null ||
        filters.maxPrice !== null
    );
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    try {
        return JSON.stringify(error) ?? String(error);
    } catch {
        return String(error);
    }
}

export default function FiltersScreen({
    initialFilters = emptyFilters,
    onFiltersChange,
    onApply,
    latitude,
    longitude,
    radiusMeters = 2000,
}: FiltersScreenProps) {

    // Stores the currently selected options
    const [filters, setFilters] = useState<Filters>(() => ({
        ...emptyFilters,
        ...initialFilters,
        locationTypes: [...(initialFilters.locationTypes ?? [])],
        amenities: [...(initialFilters.amenities ?? [])],
        priceRangeIds: [...(initialFilters.priceRangeIds ?? [])],
    }));

    // Backend result count
    const [count, setCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasCoordinates =
        typeof latitude === 'number' &&
        Number.isFinite(latitude) &&
        typeof longitude === 'number' &&
        Number.isFinite(longitude);

    const unsupported = hasUnsupportedFilters(filters);

    // NEW: Apply selections immediately to the parent.
    // No need to press Show Results to save filters.
    useEffect(() => {
        onFiltersChange?.(filters);
    }, [filters, onFiltersChange]);

    // Refresh the result count whenever filters change
    useEffect(() => {
        if (!hasCoordinates || unsupported) {
            setCount(null);
            setLoading(false);
            setError(null);
            return;
        }

        let cancelled = false;

        setLoading(true);
        setCount(null);
        setError(null);

        const timer = setTimeout(async () => {
            try {
                const backendFilters = toExploreFilters(filters);

                console.log(
                    'F-4 filters sent to B-5:',
                    backendFilters
                );

                const spots = await exploreSpots({
                    latitude: latitude!,
                    longitude: longitude!,
                    radiusMeters,
                    filters: backendFilters,
                    limit: 50,
                });

                if (!cancelled) {
                    setCount(spots.length);
                    setError(null);

                    console.log(
                        'F-4 matching spots:',
                        spots.length
                    );
                }
            } catch (err) {
                console.error(
                    'F-4 error loading spots:',
                    err
                );

                if (!cancelled) {
                    setError(getErrorMessage(err));
                    setCount(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [
        filters,
        latitude,
        longitude,
        radiusMeters,
        hasCoordinates,
        unsupported,
    ]);

    // Selecting the same noise option again deselects it
    const selectNoise = (value: string) => {
        setFilters((previous) => ({
            ...previous,
            atmosphere:
                previous.atmosphere === value
                    ? null
                    : value,
        }));
    };

    // Toggle location or amenity selection
    const toggleMulti = (
        category: 'locationTypes' | 'amenities',
        value: string
    ) => {
        setFilters((previous) => ({
            ...previous,
            [category]: previous[category].includes(value)
                ? previous[category].filter(
                    (item: string) => item !== value
                )
                : [...previous[category], value],
        }));
    };

    // Toggle price categories
    const togglePrice = (id: number) => {
        setFilters((previous) => ({
            ...previous,
            priceRangeIds: previous.priceRangeIds.includes(id)
                ? previous.priceRangeIds.filter(
                    (item: number) => item !== id
                )
                : [...previous.priceRangeIds, id],
        }));
    };

    // Toggle accessibility
    const toggleAccessibility = () => {
        setFilters((previous) => ({
            ...previous,
            accessible: !previous.accessible,
        }));
    };

    // Reset immediately updates parent through onFiltersChange
    const resetFilters = () => {
        setFilters({
            ...emptyFilters,
            locationTypes: [],
            amenities: [],
            priceRangeIds: [],
        });
    };

    // Counts every selected option, including Any noise level
    const activeCount =
        (filters.atmosphere !== null ? 1 : 0) +
        filters.locationTypes.length +
        filters.amenities.length +
        filters.priceRangeIds.length +
        (filters.accessible ? 1 : 0);

    // Render a selectable filter card
    const renderOption = (
        label: string,
        selected: boolean,
        onPress: () => void,
        isRadio = false,
        fullWidth = false
    ) => (
        <TouchableOpacity
            key={label}
            style={[
                styles.option,
                fullWidth && styles.fullWidth,
                selected && styles.selectedOption,
            ]}
            onPress={onPress}
            accessibilityRole={
                isRadio ? 'radio' : 'checkbox'
            }
            accessibilityState={{ checked: selected }}
        >
            <View
                style={[
                    isRadio ? styles.radio : styles.checkbox,
                    selected && styles.selectedIndicator,
                ]}
            >
                {selected && (
                    <Text style={styles.checkMark}>
                        {isRadio ? '●' : '✓'}
                    </Text>
                )}
            </View>

            <Text
                style={[
                    styles.optionText,
                    selected && styles.selectedText,
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );

    // Render a removable selected filter chip
    const renderActiveChip = (
        key: string,
        label: string,
        onRemove: () => void
    ) => (
        <TouchableOpacity
            key={key}
            style={styles.activeChip}
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${label} filter`}
        >
            <Text style={styles.activeChipText}>
                ✓ {label} ×
            </Text>
        </TouchableOpacity>
    );

    let buttonText = 'Show results';

    if (loading) {
        buttonText = 'Finding spots…';
    } else if (count !== null) {
        buttonText =
            count === 50
                ? 'Show 50 spots (limit)'
                : `Show ${count} ${count === 1 ? 'spot' : 'spots'
                }`;
    }

    return (
        <SafeAreaView style={styles.container}>

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerSide}>
                    <Text style={styles.logo}>
                        Spotted
                    </Text>
                </View>

                <Text style={styles.headerTitle}>
                    Filters
                </Text>

                <View style={styles.headerSideRight}>
                    <TouchableOpacity
                        style={styles.resetButton}
                        onPress={resetFilters}
                    >
                        <Text style={styles.resetText}>
                            Reset
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main filter options */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>
                    Make your break count.
                </Text>

                <Text style={styles.subtitle}>
                    Choose the atmosphere and amenities you need right now.
                </Text>

                {/* Noise level */}
                <Text style={styles.sectionTitle}>
                    Noise level
                </Text>

                <View style={styles.optionContainer}>
                    {noiseOptions.map((option) =>
                        renderOption(
                            option,
                            filters.atmosphere === option,
                            () => selectNoise(option),
                            true,
                            option === 'Social / conversation OK'
                        )
                    )}
                </View>

                {/* Location type */}
                <Text style={styles.sectionTitle}>
                    Location type
                </Text>

                <View style={styles.optionContainer}>
                    {locationOptions.map((option) =>
                        renderOption(
                            option,
                            filters.locationTypes.includes(option),
                            () => toggleMulti('locationTypes', option)
                        )
                    )}
                </View>

                {/* Amenities */}
                <Text style={styles.sectionTitle}>
                    Amenities
                </Text>

                <View style={styles.optionContainer}>
                    {amenityOptions.map((option) =>
                        renderOption(
                            option,
                            filters.amenities.includes(option),
                            () => toggleMulti('amenities', option)
                        )
                    )}
                </View>

                {/* Price range */}
                <Text style={styles.sectionTitle}>
                    Price range
                </Text>

                <View style={styles.optionContainer}>
                    {priceOptions.map((option) =>
                        renderOption(
                            option.label,
                            filters.priceRangeIds.includes(option.id),
                            () => togglePrice(option.id)
                        )
                    )}
                </View>

                {/* Accessibility */}
                <Text style={styles.sectionTitle}>
                    Accessibility
                </Text>

                <View style={styles.optionContainer}>
                    {renderOption(
                        'Accessible',
                        filters.accessible,
                        toggleAccessibility
                    )}
                </View>

                {/* Figma information */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        Crowding is shown separately for every spot;
                        "quiet" describes noise, not available seats.
                    </Text>
                </View>
            </ScrollView>

            {/* Selected filters and results */}
            <View style={styles.footer}>
                <Text style={styles.activeTitle}>
                    Active filters ({activeCount})
                </Text>

                <ScrollView
                    style={styles.activeScroll}
                    contentContainerStyle={styles.activeContainer}
                    nestedScrollEnabled
                >
                    {/* Noise level */}
                    {filters.atmosphere !== null &&
                        renderActiveChip(
                            'noise',
                            filters.atmosphere,
                            () => selectNoise(filters.atmosphere!)
                        )}

                    {/* Location types */}
                    {filters.locationTypes.map((option) =>
                        renderActiveChip(
                            `location-${option}`,
                            option,
                            () => toggleMulti('locationTypes', option)
                        )
                    )}

                    {/* Amenities */}
                    {filters.amenities.map((option) =>
                        renderActiveChip(
                            `amenity-${option}`,
                            option,
                            () => toggleMulti('amenities', option)
                        )
                    )}

                    {/* Price categories */}
                    {filters.priceRangeIds.map((id) =>
                        renderActiveChip(
                            `price-${id}`,
                            priceOptions.find((p) => p.id === id)
                                ?.label ?? String(id),
                            () => togglePrice(id)
                        )
                    )}

                    {/* Accessibility */}
                    {filters.accessible &&
                        renderActiveChip(
                            'accessible',
                            'Accessible',
                            toggleAccessibility
                        )}

                    {/* Nothing selected */}
                    {activeCount === 0 && (
                        <Text style={styles.noFilters}>
                            No filters selected
                        </Text>
                    )}
                </ScrollView>

                {/* Missing coordinates */}
                {!hasCoordinates && (
                    <Text style={styles.notice}>
                        Spot count will appear when Explore
                        provides a map location.
                    </Text>
                )}

                {/* Unsupported B-5 options */}
                {unsupported && (
                    <Text style={styles.notice}>
                        Matching count unavailable for some
                        selected filters.
                    </Text>
                )}

                {/* Backend error */}
                {error && (
                    <Text style={styles.warning}>
                        Could not load spot count.
                        Check the Expo terminal for details.
                    </Text>
                )}

                {/* Loading indicator */}
                {loading && (
                    <ActivityIndicator
                        color={colors.primaryDark}
                        style={styles.spinner}
                    />
                )}

                {/* Show Results now only navigates */}
                <TouchableOpacity
                    style={styles.showButton}
                    onPress={() => onApply?.(filters)}
                    accessibilityRole="button"
                >
                    <Text style={styles.showButtonText}>
                        {buttonText}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    header: {
        height: layout.headerHeight,
        backgroundColor: colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: layout.screenPaddingHorizontal,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },

    headerSide: {
        width: 82,
    },

    headerSideRight: {
        width: 82,
        alignItems: 'flex-end',
    },

    logo: {
        ...typography.bodyStrong,
        color: colors.primary,
    },

    headerTitle: {
        ...typography.header,
        flex: 1,
        textAlign: 'center',
        color: colors.textPrimary,
    },

    resetButton: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },

    resetText: {
        ...typography.captionStrong,
        color: colors.textPrimary,
    },

    scrollView: {
        flex: 1,
    },

    content: {
        padding: spacing.xl,
        paddingBottom: spacing.xl,
    },

    title: {
        ...typography.title,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },

    subtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
    },

    sectionTitle: {
        ...typography.bodyStrong,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },

    optionContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },

    option: {
        flexBasis: '46%',
        flexGrow: 1,
        minHeight: 60,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
    },

    fullWidth: {
        flexBasis: '100%',
    },

    selectedOption: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },

    optionText: {
        ...typography.bodySmall,
        color: colors.textPrimary,
        flexShrink: 1,
    },

    selectedText: {
        fontFamily: typography.bodyStrong.fontFamily,
    },

    radio: {
        width: 22,
        height: 22,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },

    checkbox: {
        width: 22,
        height: 22,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },

    selectedIndicator: {
        borderColor: colors.primaryDark,
    },

    checkMark: {
        color: colors.primaryDark,
        fontSize: 13,
        fontWeight: '700',
    },

    infoBox: {
        padding: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },

    infoText: {
        ...typography.caption,
        color: colors.textSecondary,
    },

    footer: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
        paddingBottom: spacing.lg,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderColor: colors.border,
    },

    activeTitle: {
        ...typography.label,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },

    activeScroll: {
        maxHeight: 88,
        marginBottom: spacing.md,
    },

    activeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        flexGrow: 1,
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

    noFilters: {
        ...typography.caption,
        color: colors.textSecondary,
    },

    warning: {
        ...typography.caption,
        color: colors.danger,
        marginBottom: spacing.sm,
    },

    notice: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },

    spinner: {
        marginBottom: spacing.xs,
    },

    showButton: {
        backgroundColor: colors.primary,
        padding: spacing.md,
        borderRadius: radius.lg,
        alignItems: 'center',
    },

    showButtonText: {
        ...typography.bodyStrong,
        color: colors.textPrimary,
    },
});
