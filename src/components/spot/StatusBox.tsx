import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { CrowdBadge, NoRecentUpdatesBadge } from '../SpotStatus';
import { formatTimeAgo } from '../../lib/formatTime';
import { isStale, noiseLabels, outletLabels } from '../../lib/spot';
import type { PostWithVotes } from '../../lib/votes';
import { colors, radius, spacing, typography } from '../../theme';
import { spotStyles, type FeatherName } from './styles';

interface StatusBoxProps {
  /** The newest post, or undefined if the spot has none. */
  post: PostWithVotes | undefined;
  /** Outlets where the post was made, or the spot's best level when there's no post. */
  outletLevel: number | null;
}

const UNKNOWN = '—';

function Stat({ icon, label, value }: { icon: FeatherName; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <View style={spotStyles.iconTile}>
        <Feather name={icon} size={16} color={colors.primaryDark} />
      </View>
      <View style={styles.statText}>
        <Text style={styles.statValue} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

/**
 * What the spot is like right now, from the newest check-in: crowding, noise, and outlets
 * where they sat. Crowding and noise from an outdated report are hidden.
 * Price and Wi-Fi are under the spot's name; policies are in the amenities.
 */
export default function StatusBox({ post, outletLevel }: StatusBoxProps) {
  const fresh = post && !isStale(post.created_at) ? post : null;

  let meta = 'No reports yet';
  if (fresh) meta = `${formatTimeAgo(fresh.created_at)} · ${fresh.author_name || 'Anonymous'}`;
  else if (post) meta = `Last report ${formatTimeAgo(post.created_at)}`;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        {fresh ? <CrowdBadge levelId={fresh.crowd_level_id} /> : <NoRecentUpdatesBadge />}
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>

      <View style={styles.grid}>
        <Stat
          icon="volume-1"
          label="Noise"
          value={
            fresh?.noise_level_id != null ? noiseLabels[fresh.noise_level_id] ?? UNKNOWN : UNKNOWN
          }
        />
        <Stat
          icon="zap"
          label="Outlets"
          value={outletLevel !== null ? outletLabels[outletLevel] ?? UNKNOWN : UNKNOWN}
        />
      </View>

      {!fresh && <Text style={spotStyles.emptyText}>Check in to share how busy it is right now.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  grid: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    flex: 1,
    minWidth: 0,
  },
  statValue: {
    ...typography.label,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
