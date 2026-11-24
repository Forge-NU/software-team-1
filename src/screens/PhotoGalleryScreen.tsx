import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

import { formatTimeAgo } from '../lib/formatTime';
import { getLocation } from '../lib/places';
import { getRecentPhotos } from '../lib/posts';
import type { RecentPhoto } from '../lib/posts';
import type { Location } from '../types/location';
import { colors, radius, spacing, typography } from '../theme';

interface PhotoGalleryScreenProps {
  locationId: number;
  onBack: () => void;
}

export default function PhotoGalleryScreen({
  locationId,
  onBack,
}: PhotoGalleryScreenProps) {
  const [location, setLocation] = useState<Location | null>(null);
  const [photos, setPhotos] = useState<RecentPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setCurrentIndex(0);

      if (!locationData) {
        setError('This spot could not be found.');
      }
    } catch (err) {
      console.error('Failed to load photo gallery:', err);
      setError('Could not load photos. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  function showPrevious() {
    setCurrentIndex((index) =>
      index === 0 ? photos.length - 1 : index - 1
    );
  }

  function showNext() {
    setCurrentIndex((index) =>
      index === photos.length - 1 ? 0 : index + 1
    );
  }

  const { bottom } = useSafeAreaInsets();

  const currentPhoto = photos[currentIndex];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Text style={styles.counter}>
              {photos.length > 0
                ? `${currentIndex + 1} of ${photos.length}`
                : '0 photos'}
            </Text>
          ),
        }}
      />

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primaryDark} />
          <Text style={styles.stateText}>Loading photos...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>Unable to load gallery</Text>
          <Text style={styles.stateText}>{error}</Text>

          <Pressable style={styles.secondaryButton} onPress={loadGallery}>
            <Text style={styles.secondaryButtonText}>Try again</Text>
          </Pressable>

          <Pressable onPress={onBack} style={styles.returnLink}>
            <Text style={styles.linkText}>Back to spot</Text>
          </Pressable>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>No photos yet</Text>
          <Text style={styles.stateText}>
            Photos shared at this spot will appear here.
          </Text>

          <Pressable style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back to spot</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            // iOS adds the home indicator inset itself (contentInsetAdjustmentBehavior)
            { paddingBottom: styles.content.paddingBottom + (Platform.OS === 'ios' ? 0 : bottom) },
          ]}
          showsVerticalScrollIndicator={false}
          // Starts below the glass header (iOS 26) but scrolls up under it
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Location and photo details */}
          <View style={styles.headingSection}>
            <Text style={styles.locationTitle}>
              {location?.name ?? 'Spot photos'}
            </Text>

            <Text style={styles.photoInfo}>
              {currentPhoto.author_name || 'Anonymous'} ·{' '}
              {formatTimeAgo(currentPhoto.created_at)}
            </Text>
          </View>

          {/* Main photo */}
          <View style={styles.mainPhotoContainer}>
            <Image
              key={currentPhoto.photo_id}
              source={{ uri: currentPhoto.url }}
              style={styles.mainPhoto}
              resizeMode="cover"
            />
          </View>

          {/* Previous, dots and next */}
          <View style={styles.navigation}>
            <Pressable
              onPress={showPrevious}
              style={styles.navButton}
              accessibilityRole="button"
            >
              <Text style={styles.navButtonText}>← Previous</Text>
            </Pressable>

            <View style={styles.dots}>
              {photos.map((photo, index) => (
                <View
                  key={photo.photo_id}
                  style={[
                    styles.dot,
                    index === currentIndex && styles.activeDot,
                  ]}
                />
              ))}
            </View>

            <Pressable
              onPress={showNext}
              style={styles.navButton}
              accessibilityRole="button"
            >
              <Text style={styles.navButtonText}>Next →</Text>
            </Pressable>
          </View>

          {/* Caption */}
          {currentPhoto.caption ? (
            <Text style={styles.caption}>{currentPhoto.caption}</Text>
          ) : null}

          {/* Thumbnails */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.carouselSection}
            contentContainerStyle={styles.carousel}
          >
            {photos.map((photo, index) => (
              <Pressable
                key={photo.photo_id}
                onPress={() => setCurrentIndex(index)}
                style={[
                  styles.thumbnailWrapper,
                  index === currentIndex && styles.selectedThumbnail,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`View photo ${index + 1}`}
              >
                <Image
                  source={{ uri: photo.url }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            onPress={onBack}
            style={styles.backButton}
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>Back to spot</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  counter: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: spacing.lg,
    paddingBottom: 36,
    alignItems: 'center',
  },
  headingSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationTitle: {
    ...typography.display,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  photoInfo: {
    ...typography.bodySmall,
    marginTop: spacing.xxs,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  mainPhotoContainer: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.textPrimary,
    overflow: 'hidden',
  },
  mainPhoto: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  navigation: {
    width: '100%',
    maxWidth: 760,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  navButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryLight,
  },
  navButtonText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  activeDot: {
    backgroundColor: colors.textPrimary,
  },
  caption: {
    ...typography.caption,
    marginTop: spacing.md,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  carouselSection: {
    width: '100%',
    maxWidth: 760,
    marginTop: spacing.lg,
  },
  carousel: {
    gap: spacing.xs,
  },
  thumbnailWrapper: {
    width: 100,
    height: 76,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
  },
  selectedThumbnail: {
    borderColor: colors.textPrimary,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    marginTop: spacing.lg,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    backgroundColor: colors.surface,
  },
  backButtonText: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  centerState: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateText: {
    ...typography.bodySmall,
    marginTop: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  secondaryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },
  secondaryButtonText: {
    ...typography.label,
    color: colors.primaryDark,
  },
  returnLink: {
    marginTop: 18,
    padding: 8,
  },
  linkText: {
    ...typography.label,
    color: colors.primaryDark,
  },
});
