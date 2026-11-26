import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Callout, Marker } from 'react-native-maps';
import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/colors';
import type { MapSpot } from '@/components/MapView';

const SIZE = 30;
const OUTLINE_WIDTH = 2;
const RING_WIDTH = 3;
const LABEL_MAX_WIDTH = 120;

interface SpotMarkerProps<T extends MapSpot> {
    location: T;
    onPress?: (location: T) => void;
}

/**
 * A map marker for a study spot, centered on the spot's coordinates.
 * Shows the location name under the pin so spots are identifiable on the map.
 */
export default function SpotMarker<T extends MapSpot>({ location, onPress }: SpotMarkerProps<T>) {
    // Custom marker labels only paint while tracksViewChanges is true; turn it off after
    // the first frame so Android doesn't redraw every marker every frame.
    const [tracksViewChanges, setTracksViewChanges] = useState(true);
    useEffect(() => {
        const id = setTimeout(() => setTracksViewChanges(false), 750);
        return () => clearTimeout(id);
    }, []);

    return (
        <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            // Anchor on the dot (top half of the marker+label stack), not the label
            anchor={{ x: 0.5, y: 0.35 }}
            tracksViewChanges={tracksViewChanges}
            title={location.name}
            onPress={() => onPress?.(location)}
            accessibilityLabel={location.name}
        >
            <View style={styles.wrapper}>
                <View style={styles.outline}>
                    <View style={styles.dot} />
                </View>
                <Text variant="caption" numberOfLines={1} style={styles.label}>
                    {location.name}
                </Text>
            </View>
            {/* Callout as a backup when the custom label is hard to read at small zoom */}
            <Callout tooltip={false}>
                <View style={styles.callout}>
                    <Text variant="bodyStrong" numberOfLines={2}>
                        {location.name}
                    </Text>
                </View>
            </Callout>
        </Marker>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        maxWidth: LABEL_MAX_WIDTH,
    },
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
    label: {
        marginTop: 2,
        maxWidth: LABEL_MAX_WIDTH,
        textAlign: 'center',
        color: colors.textPrimary,
        backgroundColor: colors.surface,
        overflow: 'hidden',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    callout: {
        maxWidth: 180,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
});
