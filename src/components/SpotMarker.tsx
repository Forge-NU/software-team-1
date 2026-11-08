import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { colors } from '@/theme/colors';
import type { Location } from '@/types/location';

const SIZE = 30;
const OUTLINE_WIDTH = 2;
const RING_WIDTH = 3;

interface SpotMarkerProps {
    location: Location;
    onPress?: (location: Location) => void;
}

/**
 * A map marker for a study spot, centered on the spot's coordinates
 */
export default function SpotMarker({ location, onPress }: SpotMarkerProps) {
    return (
        <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            // Center the dot on the coordinate, rather than the default bottom-center pin anchor
            anchor={{ x: 0.5, y: 0.5 }}
            // The marker never changes, so don't redraw it every frame (important on Android)
            tracksViewChanges={false}
            onPress={() => onPress?.(location)}
            accessibilityLabel={location.name}
        >
            <View style={styles.outline}>
                <View style={styles.dot} />
            </View>
        </Marker>
    );
}

const styles = StyleSheet.create({
    outline: {
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        borderWidth: OUTLINE_WIDTH,
        borderColor: colors.textPrimary,
        backgroundColor: colors.surface,
        padding: RING_WIDTH,
    },
    dot: {
        flex: 1,
        borderRadius: SIZE / 2,
        backgroundColor: colors.primary,
    },
});
