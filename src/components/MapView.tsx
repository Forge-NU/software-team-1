import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { type Region, type UserLocationChangeEvent } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { isSharedValue, useAnimatedProps, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import SpotMarker from '@/components/SpotMarker';
import { Text } from '@/components/ui/Text';
import { isLocationGranted, useLocationPermission } from '@/hooks/useLocationPermission';
import { colors } from '@/theme/colors';
import type { Location } from '@/types/location';
import { NU_CAMPUS } from '@/lib/exploreSource';

/** The location fields the map needs, so both Location rows and Explore results can be shown */
export type MapSpot = Pick<Location, 'location_id' | 'name' | 'latitude' | 'longitude'>;

/** Shown until the user's location is known, or if they haven't granted location access */
const DEFAULT_REGION: Region = {
    latitude: NU_CAMPUS.latitude,
    longitude: NU_CAMPUS.longitude,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
};

/** Zoom when centered on a precise location (a few blocks) */
const PRECISE_DELTA = 0.01;
/** Minimum zoom when centered on an approximate location (roughly city level) */
const APPROXIMATE_DELTA = 0.08;
const METERS_PER_DEGREE = 111_000;

const BORDER_RADIUS = 24;

/** The map as a Reanimated component, so its padding can follow a bottom sheet frame by frame */
const AnimatedMapView = Animated.createAnimatedComponent(MapView);

interface MapViewComponentProps<T extends MapSpot> {
    locations?: T[];
    /** Defaults to filling the parent's width */
    width?: DimensionValue;
    height: DimensionValue;
    /** Additional styles for the map's container (e.g. border and shadow) */
    style?: StyleProp<ViewStyle>;
    interactive?: boolean;
    /** Rounded corners and a card look. Turn off for a map that fills the screen. Defaults to true */
    rounded?: boolean;
    /**
     * Space covered by UI drawn over the map (e.g. a bottom sheet). The map keeps its logo,
     * centering and the OSM credit inside the uncovered area. `bottom` can be a shared value
     * (e.g. a sheet's live position), so they follow the sheet while it's dragged.
     */
    insets?: { top?: number; bottom?: number | SharedValue<number> };
    /** Handles pressing on a location */
    onLocationPress?: (l: T) => void;
}

export default function MapViewComponent<T extends MapSpot>(props: MapViewComponentProps<T>) {
    const rounded = props.rounded ?? true;
    const top = props.insets?.top ?? 0;

    // The bottom inset as a shared value either way, so the padding and credit update on the UI thread
    const providedBottom = props.insets?.bottom;
    const fixedBottom = useSharedValue(typeof providedBottom === 'number' ? providedBottom : 0);
    useEffect(() => {
        if (typeof providedBottom === 'number') fixedBottom.value = providedBottom;
    }, [providedBottom, fixedBottom]);
    const bottom = isSharedValue<number>(providedBottom) ? providedBottom : fixedBottom;

    // Apple Maps already keeps its logo and centering clear of the safe area (status bar, tab bar)
    // when the map runs under it, so only pad by the rest. Google Maps on Android doesn't.
    const safeArea = useSafeAreaInsets();
    const subtractSafeArea = !!props.insets && Platform.OS === 'ios';
    const safeTop = subtractSafeArea ? safeArea.top : 0;
    const safeBottom = subtractSafeArea ? safeArea.bottom : 0;
    const animatedMapProps = useAnimatedProps(() => ({
        mapPadding: {
            top: Math.max(0, top - safeTop),
            bottom: Math.max(0, bottom.value - safeBottom),
            left: 0,
            right: 0,
        },
    }));
    const attributionPosition = useAnimatedStyle(() => ({ bottom: bottom.value }));
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

    // Two wrappers: the outer one carries size, border and shadow, and the inner one clips the map to the rounded corners
    // NOTE: They can't be combined, since clipping on iOS also hides the shadow, and Android map views ignore borderRadius on themselves
    return (
        <View
            style={[
                styles.container,
                !rounded && styles.square,
                { width: props.width ?? '100%', height: props.height },
                props.style,
            ]}
        >
            <View style={[styles.clip, !rounded && styles.square]}>
                <AnimatedMapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFill}
                    initialRegion={DEFAULT_REGION}
                    // Only enable once granted: on iOS, showsUserLocation prompts for permission itself
                    showsUserLocation={isLocationGranted(permission)}
                    showsMyLocationButton={false}
                    onUserLocationChange={handleUserLocationChange}
                    animatedProps={animatedMapProps}
                >
                    {props.locations?.map((location) => (
                        <SpotMarker
                            key={location.location_id}
                            location={location}
                            onPress={props.onLocationPress}
                        />
                    ))}
                </AnimatedMapView>
                {/* Spot locations come from OpenStreetMap, whose license (ODbL) requires this credit.
                    Bottom right, so it doesn't cover the map provider's own logo and legal link. */}
                <Animated.View style={[styles.attribution, attributionPosition]} pointerEvents="none">
                    <Text variant="caption" color="textSecondary">© OpenStreetMap contributors</Text>
                </Animated.View>
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
    square: { borderRadius: 0 },
    clip: {
        flex: 1,
        borderRadius: BORDER_RADIUS,
        overflow: 'hidden',
    },
    attribution: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderTopLeftRadius: 8,
        backgroundColor: colors.surface,
        opacity: 0.85,
    },
});
