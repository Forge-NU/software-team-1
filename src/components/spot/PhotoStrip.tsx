import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTimeAgo } from '../../lib/formatTime';
import type { RecentPhoto } from '../../lib/posts';
import { colors, radius, spacing, typography } from '../../theme';
import { spotStyles } from './styles';

const PHOTO_STRIP_COUNT = 3;

interface PhotoStripProps {
  photos: RecentPhoto[];
  onSeeAll: () => void;
}

/** The three newest photos, with a link to the full gallery. */
export default function PhotoStrip({ photos, onSeeAll }: PhotoStripProps) {
  const stripPhotos = photos.slice(0, PHOTO_STRIP_COUNT);

  return (
    <View style={spotStyles.section}>
      <Pressable onPress={onSeeAll} style={styles.header}>
        <Text style={spotStyles.sectionTitle}>
          Recent photos
          {photos.length > 0 && ` · View all (${photos.length}) →`}
        </Text>
      </Pressable>

      {stripPhotos.length > 0 ? (
        <>
          <View style={styles.row}>
            {stripPhotos.map((photo) => (
              <Pressable
                key={photo.photo_id}
                onPress={onSeeAll}
                style={styles.wrapper}
              >
                <Image source={{ uri: photo.url }} style={styles.photo} />
              </Pressable>
            ))}
          </View>

          <Text style={styles.meta}>
            {formatTimeAgo(stripPhotos[0].created_at)}
          </Text>
        </>
      ) : (
        <Text style={spotStyles.emptyText}>No photos yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  wrapper: {
    flex: 1,
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.textPrimary,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  meta: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
});
