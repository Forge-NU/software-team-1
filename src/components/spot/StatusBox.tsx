import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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

interface StatusBoxProps {
  /** The newest post, or undefined if the spot has none. */
  post: PostWithVotes | undefined;
  outletLevel: number | null;
}

/** Current crowding, noise and outlets. Reports that are too old are labeled outdated. */
export default function StatusBox({ post, outletLevel }: StatusBoxProps) {
  if (!post) {
    return (
      <View style={styles.box}>
        <Text style={spotStyles.emptyText}>
          No recent updates yet. Be the first to check in!
        </Text>
      </View>
    );
  }

  const stale = isStale(post.created_at);
  const lineStyle = [styles.line, stale && styles.muted];

  return (
    <View style={[styles.box, stale && styles.boxStale]}>
      <Text style={[styles.meta, stale && spotStyles.staleText]}>
        {stale
          ? `Outdated · last reported ${formatTimeAgo(post.created_at)}`
          : `Reported ${formatTimeAgo(post.created_at)}`}
        {' · '}
        {post.author_name || 'Anonymous'}
      </Text>

      <Text style={lineStyle}>
        <Text style={styles.label}>Crowding: </Text>
        {crowdLabels[post.crowd_level_id] ?? 'Unknown'}
      </Text>

      {post.noise_level_id !== null && (
        <Text style={lineStyle}>
          <Text style={styles.label}>Noise: </Text>
          {noiseLabels[post.noise_level_id] ?? 'Unknown'}
        </Text>
      )}

      <Text style={lineStyle}>
        {[
          outletLevel !== null
            ? `Outlets: ${outletLabels[outletLevel] ?? 'Unknown'}`
            : null,
          post.wifi_mbps !== null ? `Wi-Fi ${post.wifi_mbps} Mbps` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xxs,
  },
  boxStale: {
    backgroundColor: '#FFF4E5',
    borderColor: '#F5D9A8',
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  line: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  label: {
    ...typography.label,
  },
  muted: {
    color: colors.textSecondary,
  },
});
