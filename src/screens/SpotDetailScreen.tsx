import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

import AddressCard from '../components/spot/AddressCard';
import AmenitiesCard from '../components/spot/AmenitiesCard';
import RecentUpdates from '../components/spot/RecentUpdates';
import ReportPostSheet from '../components/spot/ReportPostSheet';
import SaveButton from '../components/spot/SaveButton';
import SpotCover, { COVER_OVERLAP } from '../components/spot/SpotCover';
import StatusBox from '../components/spot/StatusBox';
import { useAuth } from '../context/AuthContext';
import { useSpotAddress } from '../hooks/useSpotAddress';
import { useSpotBookmark } from '../hooks/useSpotBookmark';
import { useSpotDetails } from '../hooks/useSpotDetails';
import { formatFloor, getAmenities, outletLevelForPost, priceLabels } from '../lib/spot';
import type { Location } from '../types/location';
import { colors, layout, radius, spacing, typography } from '../theme';

interface SpotDetailScreenProps {
  locationId: number;
  onBack: () => void;
  /** Opens the photo gallery, at a given photo if there is one. */
  onSeeAllPhotos: (locationId: number, photoId?: number) => void;
  /** Gets the spot's name too, so the check-in can show it without loading the spot again. */
  onCheckIn: (locationId: number, name: string) => void;
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
  const { location, posts, photos, seating, loading, vote, removePost, report } =
    useSpotDetails(locationId);
  const { session } = useAuth();
  const { saved, toggle: toggleSaved } = useSpotBookmark(locationId);
  const { address, status: addressStatus } = useSpotAddress(location);
  const { bottom } = useSafeAreaInsets();
  const [reportingPostId, setReportingPostId] = useState<number | null>(null);

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

  // For now Wi-Fi comes from check-ins: the latest report with a speed decides it (0 Mbps
  // means none). With no reports it says "Wi-Fi unknown" rather than guessing.
  const wifiMbps = posts.find((post) => post.wifi_mbps != null)?.wifi_mbps ?? null;
  const wifi =
    wifiMbps === null ? 'Wi-Fi unknown' : wifiMbps > 0 ? 'Wi-Fi available' : 'Wi-Fi unavailable';

  const price =
    (location.price_range_id !== null && priceLabels[location.price_range_id]) || 'Price unknown';

  // e.g. "Northeastern University · $$ · Wi-Fi available · Floor 2"
  const subtitle = [
    location.campus,
    price,
    wifi,
    amenities.floor ? formatFloor(amenities.floor) : null,
    walkMinutes !== undefined ? `${walkMinutes} min walk` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => <SaveButton saved={saved} onPress={toggleSaved} />,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        // Starts below the glass header (iOS 26) but scrolls up under it
        contentInsetAdjustmentBehavior="automatic"
      >
        <SpotCover
          location={location}
          photos={photos}
          onSeeAllPhotos={() => onSeeAllPhotos(locationId)}
        />

        {/* White rounded sheet that slides up over the cover: name, details, address */}
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.spotName}>
              {location.name}
            </Text>

            <Text style={styles.subtitle}>
              {subtitle}
            </Text>
          </View>

          <AddressCard
            name={location.name}
            address={address}
            status={addressStatus}
            // A looked-up address also helps the map app find the place itself
            onGetDirections={() => onGetDirections({ ...location, address })}
          />
        </View>

        <View style={styles.body}>
          <StatusBox
            post={latestPost}
            outletLevel={
              latestPost
                ? outletLevelForPost(seating, latestPost)
                : amenities.outletLevel
            }
          />

          <AmenitiesCard location={location} amenities={amenities} />

          <RecentUpdates
            posts={posts}
            seating={seating}
            onVote={vote}
            currentUserId={session?.user.id ?? null}
            onDelete={removePost}
            onOpenPhoto={(photoId) => onSeeAllPhotos(locationId, photoId)}
            onReport={setReportingPostId}
          />
        </View>
      </ScrollView>

      <ReportPostSheet
        postId={reportingPostId}
        onSubmit={report}
        onClose={() => setReportingPostId(null)}
      />

      <View
        style={[
          styles.actions,
          { paddingBottom: spacing.sm + bottom },
        ]}
      >
        <TouchableOpacity
          onPress={() => onCheckIn(locationId, location.name)}
          activeOpacity={0.85}
          accessibilityRole="button"
          style={styles.checkInButton}
        >
          <Text style={styles.checkInText}>
            Check in
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textOnPrimary,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  sheet: {
    marginTop: -COVER_OVERLAP,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    gap: spacing.xxs,
  },
  body: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  spotName: {
    ...typography.display,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  actions: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkInButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  checkInText: {
    ...typography.bodyStrong,
    color: colors.textOnPrimary,
  },
});
