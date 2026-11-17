
import { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    colors,
    spacing,
    radius,
    typography,
} from '../theme';

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

    // Called when Show spots is pressed
    onApply?: (filters: Filters) => void;
};

const noiseOptions = [
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

export default function FiltersScreen({
    initialFilters = emptyFilters,
    onFiltersChange,
    onApply,
}: FiltersScreenProps) {
    // The footer clears the home indicator (or keeps a small margin on devices without one);
    // the native header covers the top
    const { bottom } = useSafeAreaInsets();

    // Stores the currently selected options
    const [filters, setFilters] = useState<Filters>(() => ({
        ...emptyFilters,
        ...initialFilters,
        locationTypes: [...(initialFilters.locationTypes ?? [])],
        amenities: [...(initialFilters.amenities ?? [])],
        priceRangeIds: [...(initialFilters.priceRangeIds ?? [])],
    }));

    // NEW: Apply selections immediately to the parent.
    // No need to press Show Results to save filters.
    useEffect(() => {
        onFiltersChange?.(filters);
    }, [filters, onFiltersChange]);

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

    // Clears the sheet's selections; nothing is applied until Show spots
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

    return (
        <View style={styles.container}>
            {/* Main filter options */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                // Starts below the glass header (iOS 26) but scrolls up under it
                contentInsetAdjustmentBehavior="automatic"
            >
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
                            // TODO: Change based on size of screen
                            false
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
            </ScrollView>

            {/* Reset and Show spots */}
            <View style={[styles.footer, { paddingBottom: bottom }]}>
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[
                            styles.resetButton,
                            activeCount === 0 && styles.disabled,
                        ]}
                        onPress={resetFilters}
                        disabled={activeCount === 0}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: activeCount === 0 }}
                    >
                        <Text style={styles.resetText}>Reset</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.showButton}
                        onPress={() => onApply?.(filters)}
                        accessibilityRole="button"
                    >
                        <Text style={styles.showButtonText}>
                            Show spots
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    scrollView: {
        flex: 1,
    },

    content: {
        paddingHorizontal: spacing.xl,
    },

    sectionTitle: {
        ...typography.heading,
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
        ...typography.body,
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

    footer: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderColor: colors.border,
    },

    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },

    resetButton: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.lg,
        alignItems: 'center',
    },

    resetText: {
        ...typography.bodyStrong,
        color: colors.primaryDark,
    },

    disabled: {
        opacity: 0.4,
    },

    showButton: {
        flex: 1,
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
