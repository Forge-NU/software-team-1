import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TopBar from '../components/TopBar';
import { getLocation, getSeatingInfo } from '../lib/places';
import type { SeatingInfo } from '../lib/places';
import { getRecentPhotos } from '../lib/posts';
import type { RecentPhoto } from '../lib/posts';
import {
  getPostsWithVotes,
  setVote,
} from '../lib/votes';
import type { PostWithVotes, VoteValue } from '../lib/votes';
import type { DayHours, Location } from '../types/location';
import { colors, layout, radius, spacing, typography } from '../theme';

// Reports older than this are labeled stale.
const STALE_AFTER_HOURS = 2;
const STALE_AFTER_MS = STALE_AFTER_HOURS * 60 * 60 * 1000;
const PHOTO_STRIP_COUNT = 3;

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

const outletLabels: Record<number, string> = {
  0: 'None',
  1: 'Few',
  2: 'Some',
  3: 'Plenty',
};

const priceLabels: Record<number, string> = {
  0: 'Free',
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
};

interface SpotDetailScreenProps {
  locationId: number;
  onBack: () => void;
  onSeeAllPhotos: (locationId: number) => void;
  onCheckIn: (locationId: number) => void;
  onGetDirections: (location: Location) => void;
  walkMinutes?: number;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const difference = Date.now() - date.getTime();

  if (Number.isNaN(date.getTime())) return 'Unknown time';
  if (difference < 0) return 'Just now';

  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function isStale(dateString: string): boolean {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return true;

  return Date.now() - date.getTime() > STALE_AFTER_MS;
}

function formatFloor(floor: string): string {
  return /^\d+$/.test(floor) ? `Floor ${floor}` : floor;
}

function formatTimeLimit(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  return `${minutes} min`;
}

const WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// "08:00:00" -> "8:00am". 00:00-24:00 means open all day.
function formatClock(time: string): string {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const suffix = hour % 24 < 12 ? 'am' : 'pm';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${minuteText}${suffix}`;
}

function formatHoursRange(hours: DayHours): string {
  if (
    hours.open_time.startsWith('00:00') &&
    hours.close_time.startsWith('24:00')
  ) {
    return 'Open 24 hours';
  }

  return `${formatClock(hours.open_time)} - ${formatClock(hours.close_time)}`;
}

// Merges consecutive days with the same hours, e.g. "Monday - Friday".
function groupHours(
  dayHours: DayHours[]
): { label: string; value: string }[] {
  const sorted = dayHours
    .filter((hours) => WEEK.includes(hours.day))
    .sort((a, b) => WEEK.indexOf(a.day) - WEEK.indexOf(b.day));

  const groups: { first: string; last: string; value: string }[] = [];

  for (const hours of sorted) {
    const value = formatHoursRange(hours);
    const previous = groups[groups.length - 1];

    if (
      previous &&
      previous.value === value &&
      WEEK.indexOf(hours.day) === WEEK.indexOf(previous.last) + 1
    ) {
      previous.last = hours.day;
    } else {
      groups.push({ first: hours.day, last: hours.day, value });
    }
  }

  return groups.map((group) => ({
    label:
      group.first === group.last
        ? group.first
        : `${group.first} - ${group.last}`,
    value: group.value,
  }));
}

// Best outlet level across the spot's seating areas, or null if none are mapped.
function bestOutletLevel(seating: SeatingInfo[]): number | null {
  if (seating.length === 0) return null;

  return Math.max(...seating.map((area) => area.outlet_level_id));
}

export default function SpotDetailScreen({
  locationId,
  onBack,
  onSeeAllPhotos,
  onCheckIn,
  onGetDirections,
  walkMinutes,
}: SpotDetailScreenProps) {
  const [location, setLocation] = useState<Location | null>(null);
  const [posts, setPosts] = useState<PostWithVotes[]>([]);
  const [photos, setPhotos] = useState<RecentPhoto[]>([]);
  const [seating, setSeating] = useState<SeatingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { bottom } = useSafeAreaInsets();

  async function loadSpotDetails() {
    try {
      setLoading(true);

      const [locationData, postData, photoData, seatingData] =
        await Promise.all([
          getLocation(locationId),
          getPostsWithVotes(locationId),
          getRecentPhotos(locationId),
          getSeatingInfo(locationId),
        ]);

      setLocation(locationData);
      setPosts(postData);
      setPhotos(photoData);
      setSeating(seatingData);
    } catch (error) {
      console.error('Could not load spot details:', error);
      Alert.alert(
        'Error',
        'Could not load this spot. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSpotDetails();
  }, [locationId]);

  const latestPost = posts[0];
  const latestPostIsStale = latestPost
    ? isStale(latestPost.created_at)
    : false;
  const hasFreshPosts = posts.some(
    (post) => !isStale(post.created_at)
  );

  const floor = seating.find((area) => area.area?.floor)?.area?.floor;
  const noisePolicy = seating.find(
    (area) => area.area?.noise_policy
  )?.area?.noise_policy;
  const phonePolicy = seating.find(
    (area) => area.area?.phone_policy
  )?.area?.phone_policy;
  const timeLimit = seating.find(
    (area) => area.area?.time_limit_minutes
  )?.area?.time_limit_minutes;
  // Null means unknown, so only an explicit true or false is shown.
  const accessibility = seating
    .map((area) => area.area?.wheelchair_accessible)
    .find((value) => value !== null && value !== undefined);

  // Outlets for a post come from the seating area it was posted at,
  // falling back to the best outlet level anywhere in the spot.
  function outletLevelFor(post: PostWithVotes): number | null {
    const area = seating.find(
      (item) => item.seating_id === post.seating_id
    );

    return area?.outlet_level_id ?? bestOutletLevel(seating);
  }

  const subtitle = [
    location?.campus ?? location?.address?.street_one,
    floor ? formatFloor(floor) : null,
    walkMinutes !== undefined ? `${walkMinutes} min walk` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  async function handleVote(
    postId: number,
    selectedVote: 1 | -1
  ) {
    const post = posts.find(
      (item) => item.post_id === postId
    );

    if (!post) return;

    const previousVote = post.votes.myVote;

    const newVote: VoteValue =
      previousVote === selectedVote ? 0 : selectedVote;

    // Update the screen immediately.
    setPosts((currentPosts) =>
      currentPosts.map((item) => {
        if (item.post_id !== postId) return item;

        const votes = { ...item.votes };

        if (previousVote === 1) votes.upvotes -= 1;
        if (previousVote === -1) votes.downvotes -= 1;

        if (newVote === 1) votes.upvotes += 1;
        if (newVote === -1) votes.downvotes += 1;

        votes.score = votes.upvotes - votes.downvotes;
        votes.myVote = newVote === 0 ? null : newVote;

        return { ...item, votes };
      })
    );

    try {
      await setVote(postId, newVote);
    } catch (error) {
      console.error('Could not save vote:', error);

      // Restore only this post, so other votes made meanwhile are kept.
      setPosts((currentPosts) =>
        currentPosts.map((item) =>
          item.post_id === postId
            ? { ...item, votes: post.votes }
            : item
        )
      );

      Alert.alert(
        'Vote not saved',
        'Please try voting again.'
      );
    }
  }

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

  const latestOutlets = latestPost
    ? outletLevelFor(latestPost)
    : null;
  const outletSummary = bestOutletLevel(seating);
  const stripPhotos = photos.slice(0, PHOTO_STRIP_COUNT);

  return (
    <View style={styles.container}>
      <TopBar
        title="Spot detail"
        right={
          // Bookmarking is not wired up yet, so this is a static button.
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Save spot"
          >
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Spot information */}
        <View style={styles.section}>
          <Text style={styles.spotName}>
            {location.name}
          </Text>

          {subtitle.length > 0 && (
            <Text style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Current status */}
        <View
          style={[
            styles.statusBox,
            latestPostIsStale && styles.statusBoxStale,
          ]}
        >
          {latestPost ? (
            <>
              <Text
                style={[
                  styles.statusMeta,
                  latestPostIsStale && styles.staleText,
                ]}
              >
                {latestPostIsStale
                  ? `Outdated · last reported ${formatTimeAgo(latestPost.created_at)}`
                  : `Reported ${formatTimeAgo(latestPost.created_at)}`}
                {' · '}
                {latestPost.author_name || 'Anonymous'}
              </Text>

              <Text
                style={[
                  styles.statusLine,
                  latestPostIsStale && styles.mutedText,
                ]}
              >
                <Text style={styles.statusLabel}>
                  Crowding:{' '}
                </Text>
                {crowdLabels[latestPost.crowd_level_id] ??
                  'Unknown'}
              </Text>

              {latestPost.noise_level_id !== null && (
                <Text
                  style={[
                    styles.statusLine,
                    latestPostIsStale && styles.mutedText,
                  ]}
                >
                  <Text style={styles.statusLabel}>
                    Noise:{' '}
                  </Text>
                  {noiseLabels[latestPost.noise_level_id] ??
                    'Unknown'}
                </Text>
              )}

              <Text
                style={[
                  styles.statusLine,
                  latestPostIsStale && styles.mutedText,
                ]}
              >
                {[
                  latestOutlets !== null
                    ? `Outlets: ${outletLabels[latestOutlets] ?? 'Unknown'}`
                    : null,
                  latestPost.wifi_mbps !== null
                    ? `Wi-Fi ${latestPost.wifi_mbps} Mbps`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </>
          ) : (
            <Text style={styles.emptyText}>
              No recent updates yet. Be the first to check in!
            </Text>
          )}
        </View>

        {/* Amenities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Amenities
          </Text>

          <View style={styles.card}>
            <View style={styles.amenityRow}>
              <Text style={styles.amenityLabel}>Price</Text>
              <Text style={styles.amenityValue}>
                {location.price_range_id !== null
                  ? priceLabels[location.price_range_id] ??
                    'Unavailable'
                  : 'Unavailable'}
              </Text>
            </View>

            <View style={styles.amenityRow}>
              <Text style={styles.amenityLabel}>Outlets</Text>
              <Text style={styles.amenityValue}>
                {outletSummary !== null
                  ? outletLabels[outletSummary] ?? 'Unknown'
                  : 'Unavailable'}
              </Text>
            </View>

            {noisePolicy && (
              <View style={styles.amenityRow}>
                <Text style={styles.amenityLabel}>
                  Noise policy
                </Text>
                <Text style={styles.amenityValue}>
                  {noisePolicy}
                </Text>
              </View>
            )}

            {phonePolicy && (
              <View style={styles.amenityRow}>
                <Text style={styles.amenityLabel}>
                  Phone policy
                </Text>
                <Text style={styles.amenityValue}>
                  {phonePolicy}
                </Text>
              </View>
            )}

            {timeLimit && (
              <View style={styles.amenityRow}>
                <Text style={styles.amenityLabel}>
                  Time limit
                </Text>
                <Text style={styles.amenityValue}>
                  {formatTimeLimit(timeLimit)}
                </Text>
              </View>
            )}

            {accessibility !== undefined && (
              <View style={styles.amenityRow}>
                <Text style={styles.amenityLabel}>
                  Accessibility
                </Text>
                <Text style={styles.amenityValue}>
                  {accessibility
                    ? 'Wheelchair accessible'
                    : 'Not wheelchair accessible'}
                </Text>
              </View>
            )}

            {location.day_hours.length > 0 && (
              <>
                <Text style={styles.hoursTitle}>Hours</Text>

                {groupHours(location.day_hours).map((group) => (
                  <View
                    key={group.label}
                    style={styles.amenityRow}
                  >
                    <Text style={styles.amenityLabel}>
                      {group.label}
                    </Text>
                    <Text style={styles.amenityValue}>
                      {group.value}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        {/* Recent photos */}
        <View style={styles.section}>
          <Pressable
            onPress={() => onSeeAllPhotos(locationId)}
            style={styles.sectionHeader}
          >
            <Text style={styles.sectionTitle}>
              Recent photos
              {photos.length > 0 &&
                ` · View all (${photos.length}) →`}
            </Text>
          </Pressable>

          {stripPhotos.length > 0 ? (
            <View style={styles.photoRow}>
              {stripPhotos.map((photo) => (
                <Pressable
                  key={photo.photo_id}
                  onPress={() => onSeeAllPhotos(locationId)}
                  style={styles.photoWrapper}
                >
                  <Image
                    source={{ uri: photo.url }}
                    style={styles.photo}
                  />
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              No photos yet.
            </Text>
          )}

          {stripPhotos.length > 0 && (
            <Text style={styles.photoMeta}>
              {formatTimeAgo(stripPhotos[0].created_at)}
            </Text>
          )}
        </View>

        {/* Recent updates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Recent updates
          </Text>

          {!hasFreshPosts && (
            <Text style={styles.emptyText}>
              {posts.length > 0
                ? `No recent updates. The last report was ${formatTimeAgo(posts[0].created_at)}.`
                : 'No recent updates for this spot yet.'}
            </Text>
          )}

          {posts.map((post) => {
            const outlets = outletLevelFor(post);
            const stale = isStale(post.created_at);

            return (
              <View
                key={post.post_id}
                style={styles.updateCard}
              >
                <Text style={styles.updateHeader}>
                  {post.author_name || 'Anonymous'}
                  {' · '}
                  {formatTimeAgo(post.created_at)}
                  {stale && (
                    <Text style={styles.staleText}>
                      {' · Outdated'}
                    </Text>
                  )}
                </Text>

                <Text style={styles.updateDescription}>
                  {[
                    crowdLabels[post.crowd_level_id] ??
                      'Unknown crowd level',
                    post.noise_level_id !== null
                      ? noiseLabels[post.noise_level_id] ??
                        'Unknown noise level'
                      : null,
                    outlets !== null
                      ? `Outlets: ${outletLabels[outlets] ?? 'Unknown'}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>

                {post.caption && (
                  <Text style={styles.caption}>
                    {post.caption}
                  </Text>
                )}

                <View style={styles.voteRow}>
                  <Pressable
                    onPress={() =>
                      handleVote(post.post_id, 1)
                    }
                    style={[
                      styles.voteButton,
                      post.votes.myVote === 1 &&
                        styles.activeUpvote,
                    ]}
                  >
                    <Text
                      style={[
                        styles.voteText,
                        post.votes.myVote === 1 &&
                          styles.activeVoteText,
                      ]}
                    >
                      ↑ {post.votes.upvotes}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      handleVote(post.post_id, -1)
                    }
                    style={[
                      styles.voteButton,
                      post.votes.myVote === -1 &&
                        styles.activeDownvote,
                    ]}
                  >
                    <Text
                      style={[
                        styles.voteText,
                        post.votes.myVote === -1 &&
                          styles.activeVoteText,
                      ]}
                    >
                      ↓ {post.votes.downvotes}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
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
  saveText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: layout.screenPaddingHorizontal,
    paddingBottom: spacing.xl,
  },
  section: {
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
  statusBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xxs,
  },
  statusBoxStale: {
    backgroundColor: '#FFF4E5',
    borderColor: '#F5D9A8',
  },
  statusMeta: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  statusLine: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  statusLabel: {
    ...typography.label,
  },
  staleText: {
    color: '#92400E',
  },
  mutedText: {
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amenityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xxs,
  },
  amenityLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  amenityValue: {
    ...typography.label,
    color: colors.textPrimary,
  },
  hoursTitle: {
    ...typography.label,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xxs,
  },
  caption: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    paddingVertical: spacing.xs,
  },
  sectionHeader: {
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  photoWrapper: {
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
  photoMeta: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  updateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  updateHeader: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  updateDescription: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  voteButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  activeUpvote: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryDark,
  },
  activeDownvote: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.danger,
  },
  voteText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  activeVoteText: {
    color: colors.primaryDark,
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
