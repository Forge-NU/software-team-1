import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
}

/** One check-in update: who posted, how busy it was, and its vote buttons. */
export default function UpdateCard({
  post,
  outletLevel,
  onVote,
}: UpdateCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.header}>
        {post.author_name || 'Anonymous'}
        {' · '}
        {formatTimeAgo(post.created_at)}
        {isStale(post.created_at) && (
          <Text style={spotStyles.staleText}>{' · Outdated'}</Text>
        )}
      </Text>

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

      <View style={styles.voteRow}>
        <Pressable
          onPress={() => onVote(post.post_id, 1)}
          style={[
            styles.voteButton,
            post.votes.myVote === 1 && styles.activeUpvote,
          ]}
        >
          <Text
            style={[
              styles.voteText,
              post.votes.myVote === 1 && styles.activeVoteText,
            ]}
          >
            ↑ {post.votes.upvotes}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onVote(post.post_id, -1)}
          style={[
            styles.voteButton,
            post.votes.myVote === -1 && styles.activeDownvote,
          ]}
        >
          <Text
            style={[
              styles.voteText,
              post.votes.myVote === -1 && styles.activeVoteText,
            ]}
          >
            ↓ {post.votes.downvotes}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  header: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  description: {
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
});
