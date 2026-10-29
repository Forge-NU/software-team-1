import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getLocation } from '../lib/places';
import { getRecentPhotos } from '../lib/posts';
import { getPostsWithVotes, setVote } from '../lib/votes';
import type { Location } from '../types/location';
import { colors, layout, radius, spacing, typography } from '../theme';

interface SpotDetailScreenProps {
  locationId: number;
  onBack: () => void;
  onSeeAllPhotos: (locationId: number) => void;
  onCheckIn: (locationId: number) => void;
  onGetDirections: (location: Location) => void;
}

const crowdLabels: Record<number, string> = {
  1: 'Empty',
  2: 'Quiet',
  3: 'Moderate',
  4: 'Busy',
  5: 'Packed',
};

const noiseLabels: Record<number, string> = {
  1: 'Silent',
  2: 'Quiet',
  3: 'Moderate',
  4: 'Loud',
  5: 'Very Loud',
};

export default function SpotDetailScreen({
  locationId,
  onBack,
  onSeeAllPhotos,
  onCheckIn,
  onGetDirections,
}: SpotDetailScreenProps) {
  const [location, setLocation] = useState<Location | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSpotDetails() {
      setLoading(true);

      try {
        const [locationResult, postsResult, photosResult] =
          await Promise.all([
            getLocation(locationId),
            getPostsWithVotes(locationId),
            getRecentPhotos(locationId, 3),
          ]);

        if (cancelled) return;

        setLocation(locationResult);
        setPosts(postsResult);
        setPhotos(photosResult);
      } catch (error) {
        console.error('Error loading spot details:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    setIsSaved(false);
    loadSpotDetails();

    return () => {
      cancelled = true;
    };
  }, [locationId]);

  async function handleVote(postId: number, vote: 1 | -1) {
    try {
      await setVote(postId, vote);
      const updatedPosts = await getPostsWithVotes(locationId);
      setPosts(updatedPosts);
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  }

  const latestPost = posts[0];

  const subtitle = location
    ? [
        location.campus,
        location.address?.street_one,
        location.address?.city,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryDark} />
        <Text style={styles.loadingText}>Loading spot...</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Spot not found.</Text>
        <Pressable onPress={onBack}>
          <Text style={styles.linkText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <Pressable onPress={onBack} style={styles.navSide}>
          <Text style={styles.brandText}>Spotted</Text>
        </Pressable>

        <Text style={styles.navTitle}>Spot details</Text>

        <Pressable
          onPress={() => setIsSaved((previous) => !previous)}
          style={[styles.saveButton, isSaved && styles.savedButton]}
        >
          <Text style={styles.saveButtonText}>
            {isSaved ? 'Saved ✓' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.spotHeading}>
          <Text style={styles.spotName}>{location.name}</Text>

          {subtitle ? (
            <Text style={styles.spotSubtitle}>{subtitle}</Text>
          ) : null}

          <Text style={styles.locationType}>
            {location.location_type}
          </Text>
        </View>

        <View style={styles.reportCard}>
          <Text style={styles.sectionTitle}>Latest report</Text>

          {latestPost ? (
            <>
              <Text style={styles.reportMeta}>
                {new Date(latestPost.created_at).toLocaleString()}
                {' · '}
                {latestPost.author_name}
              </Text>

              <View style={styles.reportGrid}>
                <View style={styles.reportItem}>
                  <Text style={styles.reportLabel}>Crowd</Text>
                  <Text style={styles.reportValue}>
                    {crowdLabels[latestPost.crowd_level_id] ?? 'Unknown'}
                  </Text>
                </View>

                <View style={styles.reportItem}>
                  <Text style={styles.reportLabel}>Noise</Text>
                  <Text style={styles.reportValue}>
                    {latestPost.noise_level_id == null
                      ? 'Not reported'
                      : noiseLabels[latestPost.noise_level_id] ?? 'Unknown'}
                  </Text>
                </View>

                {latestPost.wifi_mbps != null ? (
                  <View style={styles.reportItem}>
                    <Text style={styles.reportLabel}>Wi-Fi</Text>
                    <Text style={styles.reportValue}>
                      {latestPost.wifi_mbps} Mbps
                    </Text>
                  </View>
                ) : null}
              </View>

              {latestPost.caption ? (
                <Text style={styles.caption}>{latestPost.caption}</Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.emptyText}>
              No reports yet. Be the first to check in!
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent photos</Text>

            <Pressable onPress={() => onSeeAllPhotos(locationId)}>
              <Text style={styles.linkText}>
                View all ({photos.length}) →
              </Text>
            </Pressable>
          </View>

          {photos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoRow}
            >
              {photos.map((photo) => (
                <Pressable
                  key={photo.photo_id}
                  onPress={() => onSeeAllPhotos(locationId)}
                >
                  <Image
                    source={{ uri: photo.url }}
                    style={styles.photo}
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyPhotoBox}>
              <Text style={styles.emptyText}>No photos yet.</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent updates</Text>

          {posts.length > 0 ? (
            posts.map((post) => (
              <View key={post.post_id} style={styles.updateCard}>
                <View style={styles.updateHeader}>
                  <Text style={styles.updateAuthor}>
                    {post.author_name}
                  </Text>
                  <Text style={styles.updateDate}>
                    {new Date(post.created_at).toLocaleString()}
                  </Text>
                </View>

                {post.caption ? (
                  <Text style={styles.updateCaption}>{post.caption}</Text>
                ) : (
                  <Text style={styles.updateCaption}>
                    Shared a spot update
                  </Text>
                )}

                <View style={styles.voteRow}>
                  <Pressable
                    onPress={() => handleVote(post.post_id, 1)}
                    style={styles.voteButton}
                  >
                    <Text style={styles.voteText}>
                      ↑ {post.upvotes ?? 0}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleVote(post.post_id, -1)}
                    style={styles.voteButton}
                  >
                    <Text style={styles.voteText}>
                      ↓ {post.downvotes ?? 0}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No updates yet.</Text>
          )}
        </View>

        <Pressable
          onPress={() => onCheckIn(locationId)}
          style={styles.checkInButton}
        >
          <Text style={styles.checkInButtonText}>Check In</Text>
        </Pressable>

        <Pressable
          onPress={() => onGetDirections(location)}
          style={styles.directionsButton}
        >
          <Text style={styles.directionsText}>Get Directions →</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  navBar: {
    height: layout.headerHeight,
    paddingHorizontal: layout.screenPaddingHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navSide: {
    width: 85,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  saveButton: {
    minWidth: 64,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  savedButton: {
    backgroundColor: colors.primaryLight,
  },
  saveButtonText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  spotHeading: {
    marginBottom: spacing.lg,
  },
  spotName: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  spotSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  locationType: {
    fontSize: 13,
    color: colors.primaryDark,
    textTransform: 'capitalize',
  },
  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reportMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  reportItem: {
    minWidth: 80,
  },
  reportLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  reportValue: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  caption: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  linkText: {
    fontSize: 14,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  photoRow: {
    gap: spacing.sm,
  },
  photo: {
    width: 150,
    height: 115,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  emptyPhotoBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  updateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  updateAuthor: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  updateDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  updateCaption: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  voteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  voteButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  voteText: {
    fontSize: 14,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  checkInButton: {
    backgroundColor: '#99C3E4',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  checkInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  directionsButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  directionsText: {
    fontSize: 14,
    color: colors.primaryDark,
    fontWeight: '600',
  },
});