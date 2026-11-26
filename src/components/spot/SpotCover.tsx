import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Feather, Ionicons } from '@expo/vector-icons';

import { OsmAttribution, type MapSpot } from '../MapView';
import type { RecentPhoto } from '../../lib/posts';
import { plural } from '../../lib/spotFormat';
import { colors, radius, spacing } from '../../theme';
import { spotStyles } from './styles';

/** How far the info sheet below slides up over the cover. */
export const COVER_OVERLAP = spacing.xl;

const COVER_HEIGHT = 220;
/** A few blocks around the spot */
const ZOOM_DELTA = 0.004;
const PIN_SIZE = 40;
const THUMB_SIZE = 56;

interface SpotCoverProps {
  location: MapSpot;
  photos: RecentPhoto[];
  onSeeAllPhotos: () => void;
}

/**
 * A fixed map centered on the spot. When the spot has photos, the newest one sits in the
 * corner as a thumbnail with the photo count, and tapping either opens the gallery.
 * The map doesn't pan or zoom, so it never fights the screen's scrolling.
 */
export default function SpotCover({ location, photos, onSeeAllPhotos }: SpotCoverProps) {
  return (
    <View style={styles.cover}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: ZOOM_DELTA,
          longitudeDelta: ZOOM_DELTA,
        }}
        // Keeps the provider's logo and legal link above the sheet, and the pin centered in what's visible
        mapPadding={{ top: 0, right: 0, bottom: COVER_OVERLAP, left: 0 }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsPointsOfInterests
        accessibilityLabel={`Map showing ${location.name}`}
      >
        <Marker
          coordinate={{ latitude: location.latitude, longitude: location.longitude }}
          // The pin's tip sits on the spot, not its middle
          anchor={{ x: 0.5, y: 1 }}
          accessibilityLabel={location.name}
        >
          <Ionicons name="location" size={PIN_SIZE} color={colors.primaryDark} style={styles.pin} />
        </Marker>
      </MapView>

      <OsmAttribution corner="topRight" />

      {photos.length > 0 && (
        <TouchableOpacity
          onPress={onSeeAllPhotos}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`View all ${plural(photos.length, 'photo')}`}
          style={styles.photos}
        >
          <Image source={{ uri: photos[0].url }} style={styles.thumb} />

          <View style={[spotStyles.photoBadge, styles.chip]}>
            <Feather name="camera" size={12} color={colors.textOnPrimary} />
            <Text style={spotStyles.photoBadgeText}>{plural(photos.length, 'photo')}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: COVER_HEIGHT,
    backgroundColor: colors.primaryLight,
  },
  pin: {
    textShadowColor: 'rgba(17, 24, 39, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  photos: {
    position: 'absolute',
    right: spacing.md,
    bottom: COVER_OVERLAP + spacing.sm,
    // Thumbnail and chip share a right edge
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.border,
  },
  chip: {
    paddingVertical: spacing.xxs,
  },
});
