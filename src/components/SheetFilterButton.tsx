import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

import { colors, typography } from '../theme';

const SIZE = 48;

/** iOS 26+ with Liquid Glass on (false on Android, older iOS, or with the compatibility setting) */
const liquidGlass = isLiquidGlassAvailable();

/**
 * Round Filters button for the Explore sheet's header, with a count badge while filters are on.
 * - iOS 26+: an interactive Liquid Glass button, which grows and shimmers while pressed like the
 *   system's own glass buttons, tinted while filters are on.
 * - Elsewhere: a white circle with a border (Material "filter_list" and a ripple on Android).
 */
export default function SheetFilterButton({
    activeCount,
    onPress,
}: {
    activeCount: number;
    onPress: () => void;
}) {
    const active = activeCount > 0;
    const label = active ? `Filters, ${activeCount} active` : 'Filters';
    const iconColor = active ? colors.primaryDark : colors.textPrimary;

    const icon = Platform.OS === 'ios'
        ? <Ionicons name="filter" size={20} color={iconColor} />
        : <MaterialIcons name="filter-list" size={22} color={iconColor} />;

    const button = (
        <Pressable
            style={[styles.pressable, !liquidGlass && styles.plain, !liquidGlass && active && styles.plainActive]}
            onPress={onPress}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={label}
            android_ripple={{ color: colors.border, borderless: true, radius: SIZE / 2 }}
        >
            {icon}
        </Pressable>
    );

    return (
        // The badge sits outside the glass, so the glass's rounded clip doesn't cut it off
        <View style={styles.container}>
            {liquidGlass ? (
                <GlassView
                    isInteractive
                    tintColor={active ? colors.primaryLight : undefined}
                    style={styles.glass}
                >
                    {button}
                </GlassView>
            ) : button}
            {active && (
                <View style={styles.badge} pointerEvents="none">
                    <Text style={styles.badgeText}>{activeCount}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { width: SIZE, height: SIZE },
    glass: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
    pressable: {
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    plain: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    plainActive: {
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
});
