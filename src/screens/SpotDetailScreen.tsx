import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AmenitiesCard from '../components/spot/AmenitiesCard';
import PhotoStrip from '../components/spot/PhotoStrip';
import RecentUpdates from '../components/spot/RecentUpdates';
import SaveButton from '../components/spot/SaveButton';
import StatusBox from '../components/spot/StatusBox';
import TopBar from '../components/TopBar';
import { useSpotBookmark } from '../hooks/useSpotBookmark';
import { useSpotDetails } from '../hooks/useSpotDetails';
import { formatFloor, getAmenities, outletLevelForPost } from '../lib/spot';
import type { Location } from '../types/location';
import { colors, layout, radius, spacing, typography } from '../theme';

interface SpotDetailScreenProps {
  locationId: number;
  onBack: () => void;
  onSeeAllPhotos: (locationId: number) => void;
  onCheckIn: (locationId: number) => void;
  onGetDirections: (location: Location) => void;
  walkMinutes?: number;
}

export default function SpotDetailScreen({
  locationId,
  onBack,
  onSeeAllPhotos,
  onCheckIn,
  onGetDirections,
  walkMinutes,
}: SpotDetailScreenProps) {
  const { location, posts, photos, seating, loading, vote } =
    useSpotDetails(locationId);
  const { saved, toggle: toggleSaved } = useSpotBookmark(locationId);
  const { bottom } = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={colors.primaryDark}
        />
        <Text style={styles.loadingText}>
          Loading spot details...
        </Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>
          Spot not found
        </Text>

        <Pressable
          onPress={onBack}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  const amenities = getAmenities(seating);
  const latestPost = posts[0];

  const subtitle = [
    location.campus ?? location.address?.street_one,
    amenities.floor ? formatFloor(amenities.floor) : null,
    walkMinutes !== undefined ? `${walkMinutes} min walk` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.container}>
      <TopBar
        title="Spot detail"
        onBack={onBack}
        right={<SaveButton saved={saved} onPress={toggleSaved} />}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.spotName}>
            {location.name}
          </Text>

          {subtitle.length > 0 && (
            <Text style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>

        <StatusBox
          post={latestPost}
          outletLevel={
            latestPost ? outletLevelForPost(seating, latestPost) : null
          }
        />

        <AmenitiesCard location={location} amenities={amenities} />

        <PhotoStrip
          photos={photos}
          onSeeAll={() => onSeeAllPhotos(locationId)}
        />

        <RecentUpdates
          posts={posts}
          seating={seating}
          onVote={vote}
        />
      </ScrollView>

      {/* Main actions */}
      <View
        style={[
          styles.actions,
          { paddingBottom: spacing.md + bottom },
        ]}
      >
        <Pressable
          onPress={() => onCheckIn(locationId)}
          style={styles.checkInButton}
        >
          <Text style={styles.checkInText}>
            Check in
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onGetDirections(location)}
          hitSlop={8}
        >
          <Text style={styles.directionsText}>
            Get directions
            {walkMinutes !== undefined &&
              ` · ${walkMinutes} min walk`}
            {' →'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  heading: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  primaryButtonText: {
    ...typography.bodyStrong,
    color: colors.surface,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: layout.screenPaddingHorizontal,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  spotName: {
    ...typography.display,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  actions: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  checkInButton: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  checkInText: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  directionsText: {
    ...typography.bodySmall,
    color: colors.primaryDark,
  },
});
