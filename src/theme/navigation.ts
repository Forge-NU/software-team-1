import type { NativeStackNavigationOptions } from 'expo-router';

import { colors } from './colors';
import { typography } from './typography';

/**
 * Native stack header styling, shared by the root stack and each tab's stack.
 *
 * On iOS 26+ the header is transparent Liquid Glass and screens start underneath it.
 * Give each screen's main ScrollView / FlatList `contentInsetAdjustmentBehavior="automatic"`
 * so its content starts below the header but still scrolls up under the glass.
 */
export const stackScreenOptions: NativeStackNavigationOptions = {
    contentStyle: { backgroundColor: colors.background },
    headerTintColor: colors.primaryDark,
    headerTitleStyle: {
        fontFamily: typography.heading.fontFamily,
        fontSize: typography.heading.fontSize,
        color: colors.textPrimary,
    },
    headerTitleAlign: 'center',
    // Chevron only; otherwise iOS labels it with the previous screen's title, e.g. "(tabs)"
    headerBackButtonDisplayMode: 'minimal',
};
