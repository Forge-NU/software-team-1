import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { formatTimeAgo } from '../../lib/formatTime';
import {
  crowdLabels,
  isStale,
  noiseLabels,
  outletLabels,
} from '../../lib/spot';
import type { PostWithVotes } from '../../lib/votes';
import { colors, radius, spacing, typography } from '../../theme';
import { spotStyles } from './styles';

interface UpdateCardProps {
  post: PostWithVotes;
  outletLevel: number | null;
  onVote: (postId: number, vote: 1 | -1) => void;
  /** Opens the spot's photo gallery at this photo. */
  onOpenPhoto: (photoId: number) => void;
  /** Leave off to hide Report, e.g. on your own update */
  onReport?: (postId: number) => void;
}

const VOTE_STYLES = {
  up: { icon: 'arrow-up', label: 'Upvote', color: colors.primaryDark, fill: colors.primaryLight },
  down: { icon: 'arrow-down', label: 'Downvote', color: colors.danger, fill: '#FEE2E2' },
} as const;

interface VoteButtonProps {
  direction: keyof typeof VOTE_STYLES;
  count: number;
  /** The current user's vote */
  active: boolean;
  onPress: () => void;
}

function VoteButton({ direction, count, active, onPress }: VoteButtonProps) {
  const { icon, label, color, fill } = VOTE_STYLES[direction];
  const tint = active ? color : colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count}`}
      accessibilityState={{ selected: active }}
      style={[styles.voteButton, active && { backgroundColor: fill, borderColor: color }]}
    >
      <Feather name={icon} size={14} color={tint} />
      <Text style={[styles.voteText, { color: tint }]}>{count}</Text>
    </Pressable>
  );
}

/**
 * One check-in update: who posted, how busy it was, its photo, vote buttons and Report.
 * Tapping the photo opens it in the spot's gallery.
 */
export default function UpdateCard({
  post,
  outletLevel,
  onVote,
  onOpenPhoto,
  onReport,
}: UpdateCardProps) {
  const author = post.author_name || 'Anonymous';
  const { myVote, upvotes, downvotes } = post.votes;
  const [cover, ...morePhotos] = post.photos;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{author.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.headerText}>
          <Text style={styles.author} numberOfLines={1}>
            {author}
          </Text>
          <Text style={styles.time}>
            {formatTimeAgo(post.created_at)}
            {isStale(post.created_at) && (
              <Text style={spotStyles.staleText}>{' · Outdated'}</Text>
            )}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>
        {[
          crowdLabels[post.crowd_level_id] ?? 'Unknown crowd level',
          post.noise_level_id !== null
            ? noiseLabels[post.noise_level_id] ?? 'Unknown noise level'
            : null,
          outletLevel !== null
            ? `Outlets: ${outletLabels[outletLevel] ?? 'Unknown'}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>

      {post.caption && <Text style={spotStyles.caption}>{post.caption}</Text>}

      {cover && (
        <Pressable
          onPress={() => onOpenPhoto(cover.photo_id)}
          accessibilityRole="button"
          accessibilityLabel="View photo in the gallery"
        >
          <Image source={{ uri: cover.url }} style={styles.photo} />
          {morePhotos.length > 0 && (
            <View style={[spotStyles.photoBadge, styles.more]}>
              <Text style={spotStyles.photoBadgeText}>+{morePhotos.length}</Text>
            </View>
          )}
        </Pressable>
      )}

      <View style={styles.voteRow}>
        <VoteButton
          direction="up"
          count={upvotes}
          active={myVote === 1}
          onPress={() => onVote(post.post_id, 1)}
        />
        <VoteButton
          direction="down"
          count={downvotes}
          active={myVote === -1}
          onPress={() => onVote(post.post_id, -1)}
        />

        {onReport && (
          <Pressable
            onPress={() => onReport(post.post_id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Report update from ${author}`}
            style={styles.reportButton}
          >
            <Text style={styles.reportText}>Report</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  photo: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    backgroundColor: colors.border,
    marginTop: spacing.xxs,
  },
  more: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.bodyStrong,
    color: colors.textOnPrimaryLight,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  author: {
    ...typography.label,
    color: colors.textPrimary,
  },
  time: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  voteText: {
    ...typography.label,
  },
  reportButton: {
    marginLeft: 'auto',
  },
  reportText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
