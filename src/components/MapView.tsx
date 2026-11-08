import { useRef } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { type Region, type UserLocationChangeEvent } from 'react-native-maps';
import SpotMarker from '@/components/SpotMarker';
import { isLocationGranted, useLocationPermission } from '@/hooks/useLocationPermission';
import { colors } from '@/theme/colors';
import type { Location } from '@/types/location';

/** Shown until the user's location is known, or if they haven't granted location access */
const DEFAULT_REGION: Region = {
    latitude: 42.3398,
    longitude: -71.0892,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
};

/** Zoom when centered on a precise location (a few blocks) */
const PRECISE_DELTA = 0.01;
/** Minimum zoom when centered on an approximate location (roughly city level) */
const APPROXIMATE_DELTA = 0.08;
const METERS_PER_DEGREE = 111_000;

const BORDER_RADIUS = 24;

interface MapViewComponentProps {
    locations?: Location[];
    /** Defaults to filling the parent's width */
    width?: DimensionValue;
    height: DimensionValue;
    /** Additional styles for the map's container (e.g. border and shadow) */
    style?: StyleProp<ViewStyle>;
    interactive?: boolean;
    /** Handles pressing on a location */
    onLocationPress?: (l: Location) => void;
}

export default function MapViewComponent(props: MapViewComponentProps) {
    const mapRef = useRef<MapView>(null);
    const { permission } = useLocationPermission();
    // Only center on the user once, so the map doesn't jump back while they're panning
    const hasCentered = useRef(false);

    const handleUserLocationChange = (event: UserLocationChangeEvent) => {
        const coordinate = event.nativeEvent.coordinate;
        if (hasCentered.current || !coordinate) return;
        hasCentered.current = true;

        // Approximate locations can be several km off, so zoom out enough to cover that area
        const delta = permission === 'approximate'
            ? Math.max(APPROXIMATE_DELTA, (coordinate.accuracy / METERS_PER_DEGREE) * 2.5)
            : PRECISE_DELTA;

        mapRef.current?.animateToRegion({
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            latitudeDelta: delta,
            longitudeDelta: delta,
        }, 400);
    };

    // TODO: Prompt for location permission if not granted and possible
    // TODO: © OpenStreetMap contributors
    
    // Two wrappers: the outer one carries size, border and shadow, and the inner one clips the map to the rounded corners
    // NOTE: They can't be combined, since clipping on iOS also hides the shadow, and Android map views ignore borderRadius on themselves
    return (
        <View style={[styles.container, { width: props.width ?? '100%', height: props.height }, props.style]}>
            <View style={styles.clip}>
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFill}
                    initialRegion={DEFAULT_REGION}
                    // Only enable once granted: on iOS, showsUserLocation prompts for permission itself
                    showsUserLocation={isLocationGranted(permission)}
                    showsMyLocationButton={false}
                    onUserLocationChange={handleUserLocationChange}
                >
                    {props.locations?.map((location) => (
                        <SpotMarker
                            key={location.location_id}
                            location={location}
                            onPress={props.onLocationPress}
                        />
                    ))}
                </MapView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: BORDER_RADIUS,
        // Android only draws elevation shadows on views with a background
        backgroundColor: colors.surface,
    },
    clip: {
        flex: 1,
        borderRadius: BORDER_RADIUS,
        overflow: 'hidden',
    },
});
