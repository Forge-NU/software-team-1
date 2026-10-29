
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import TopBar from '../components/TopBar';
import { getLocation } from '../lib/places';
import { getRecentPhotos } from '../lib/posts';
import type { Location } from '../types/location';
import type { RecentPhoto } from '../lib/posts';
import { colors, layout, radius, spacing, typography } from '../theme';

interface PhotoGalleryScreenProps {
  locationId: number;
  onBack: () => void;
}

export default function PhotoGalleryScreen({
  locationId,
  onBack,
}: PhotoGalleryScreenProps) {
  const [spot, setSpot] = useState<Location | null>(null);
  const [photos, setPhotos] = useState<RecentPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<RecentPhoto | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGallery() {
      setLoading(true);
      setError(null);

      try {
        const [locationData, photoData] = await Promise.all([
          getLocation(locationId),
          getRecentPhotos(locationId),
        ]);

        if (!cancelled) {
          setSpot(locationData);
          setPhotos(photoData);
        }
      } catch (err) {
        console.error('Failed to load photo gallery:', err);

        if (!cancelled) {
          setError('Could not load photos. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGallery();

    return () => {
      cancelled = true;
    };
  }, [locationId]);

  return (
    <View style={styles.container}>
      <TopBar title="Photos" onBack={onBack} />

      <View style={styles.heading}>
        <Text style={styles.title}>Photo gallery</Text>
        <Text style={styles.subtitle}>
          {spot?.name ?? 'Spot photos'}
        </Text>
        {!loading && !error && (
          <Text style={styles.photoCount}>
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primaryDark} />
          <Text style={styles.message}>Loading photos...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.message}>{error}</Text>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>▧</Text>
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.message}>
            Check in at this spot and share a photo to help other students.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {photos.map((photo) => (
            <Pressable
              key={photo.photo_id}
              style={styles.photoTile}
              onPress={() => setSelectedPhoto(photo)}
              accessibilityRole="button"
              accessibilityLabel="View photo full screen"
            >
              <Image
                source={{ uri: photo.url }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modal}>
          <Pressable
            style={styles.closeButton}
            onPress={() => setSelectedPhoto(null)}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          {selectedPhoto && (
            <>
              <Image
                source={{ uri: selectedPhoto.url }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              <Text style={styles.photoDate}>
                {new Date(selectedPhoto.created_at).toLocaleDateString()}
              </Text>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heading: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  photoCount: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  grid: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingBottom: spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoTile: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.primaryLight,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyIcon: {
    fontSize: 44,
    color: colors.primaryDark,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 24,
    zIndex: 1,
    padding: spacing.sm,
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 28,
  },
  fullImage: {
    width: '100%',
    height: '75%',
  },
  photoDate: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    marginTop: spacing.md,
  },
});
