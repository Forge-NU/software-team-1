import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PhotoViewer from '../components/spot/PhotoViewer';
import { formatDayLabel, formatTimeAgo } from '../lib/formatTime';
import { getLocation } from '../lib/places';
import { plural } from '../lib/spotFormat';
import { spotStyles } from '../components/spot/styles';
import { getRecentPhotos } from '../lib/posts';
import type { RecentPhoto } from '../lib/posts';
import type { Location } from '../types/location';
import { colors, layout, radius, spacing, typography } from '../theme';

interface PhotoGalleryScreenProps {
  locationId: number;
  /** Photo to open full screen right away, e.g. the one tapped in an update. */
  initialPhotoId?: number;
  onBack: () => void;
}

const GAP = 4;
const COLUMNS = 3;

/** One day's photos, plus each photo's position in the full list (for the viewer). */
interface DayGroup {
  label: string;
  items: { photo: RecentPhoto; index: number }[];
}

/** Photos are newest first, so each day's photos are already together. */
function groupByDay(photos: RecentPhoto[]): DayGroup[] {
  const groups: DayGroup[] = [];
  photos.forEach((photo, index) => {
    const label = formatDayLabel(photo.created_at);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push({ photo, index });
    else groups.push({ label, items: [{ photo, index }] });
  });
  return groups;
}

/** A spot's recent photos as an even grid, grouped by day, newest first, each tagged with who posted it. */
export default function PhotoGalleryScreen({
  locationId,
  initialPhotoId,
  onBack,
}: PhotoGalleryScreenProps) {
  const [location, setLocation] = useState<Location | null>(null);
  const [photos, setPhotos] = useState<RecentPhoto[]>([]);
  /** The photo open full screen, or null for the grid. */
  const [viewing, setViewing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { width } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const tile = (width - layout.screenPaddingHorizontal * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  const loadGallery = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [locationData, photoData] = await Promise.all([
        getLocation(locationId),
        getRecentPhotos(locationId),
      ]);

      setLocation(locationData);
      setPhotos(photoData);

      if (!locationData) {
        setError('This spot could not be found.');
      }

      const start = photoData.findIndex((photo) => photo.photo_id === initialPhotoId);
      if (start >= 0) setViewing(start);
    } catch (err) {
      console.error('Failed to load photo gallery:', err);
      setError('Could not load photos. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [locationId, initialPhotoId]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primaryDark} />
        <Text style={styles.stateText}>Loading photos...</Text>
      </View>
    );
  }

  if (error || photos.length === 0) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.stateTitle}>{error ? 'Unable to load gallery' : 'No photos yet'}</Text>
        <Text style={styles.stateText}>
          {error ?? 'Photos shared at this spot will appear here.'}
        </Text>

        {error && (
          <Pressable style={styles.button} onPress={loadGallery}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        )}

        <Pressable onPress={onBack} style={styles.link}>
          <Text style={styles.linkText}>Back to spot</Text>
        </Pressable>
      </View>
    );
  }

  const checkIns = new Set(photos.map((photo) => photo.post_id)).size;

  const renderTile = ({ photo, index }: DayGroup['items'][number]) => {
    const author = photo.author_name || 'Anonymous';
    return (
      <Pressable
        key={photo.photo_id}
        onPress={() => setViewing(index)}
        accessibilityRole="button"
        accessibilityLabel={`Photo by ${author}, ${formatTimeAgo(photo.created_at)}`}
        style={[styles.tile, { width: tile, height: tile }]}
      >
        <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} />
        {/* Name only; the day heading says when */}
        <View style={[spotStyles.photoBadge, styles.who]}>
          <Text style={[spotStyles.photoBadgeText, styles.whoText]} numberOfLines={1}>
            {author}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: spacing.xl + (Platform.OS === 'ios' ? 0 : bottom),
        }}
        showsVerticalScrollIndicator={false}
        // Starts below the glass header (iOS 26) but scrolls up under it
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.header}>
          <Text style={styles.spotName}>{location?.name ?? 'Spot photos'}</Text>
          <Text style={styles.summary}>
            {plural(photos.length, 'photo')} from {plural(checkIns, 'check-in')}
          </Text>
        </View>

        {groupByDay(photos).map((group) => (
          <View key={group.label} style={styles.day}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{group.label}</Text>
              <Text style={styles.dayCount}>
                {plural(group.items.length, 'photo')}
              </Text>
            </View>

            <View style={styles.grid}>{group.items.map(renderTile)}</View>
          </View>
        ))}
      </ScrollView>

      <PhotoViewer photos={photos} startIndex={viewing} onClose={() => setViewing(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xxs,
  },
  spotName: {
    ...typography.title,
    color: colors.textPrimary,
  },
  summary: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  day: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  dayLabel: {
    ...typography.label,
    color: colors.textPrimary,
  },
  dayCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  tile: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  who: {
    position: 'absolute',
    left: spacing.xxs + 2,
    bottom: spacing.xxs + 2,
    maxWidth: '85%',
  },
  // Smaller than other badges so names fit on the tiles
  whoText: {
    ...typography.tag,
    lineHeight: 16,
  },
  centerState: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  stateTitle: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateText: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  buttonText: {
    ...typography.label,
    color: colors.primaryDark,
  },
  link: {
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  linkText: {
    ...typography.label,
    color: colors.primaryDark,
  },
});
