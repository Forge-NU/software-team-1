import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Text } from '@/components/ui';
import { CROWD_LEVELS, NOISE_LEVELS, type CrowdLevelId, type NoiseLevelId } from '@/constants/lookups';
import { crowdTone, type CrowdTone } from '@/lib/spotFormat';
import { colors, type ColorName } from '@/theme';

type IconName = ComponentProps<typeof Feather>['name'];

// Written out in full so NativeWind can find the class names
const CROWD_TONES: Record<CrowdTone, { surface: string; dot: string; text: ColorName }> = {
  low: { surface: 'bg-crowdLowSurface', dot: 'bg-crowdLow', text: 'crowdLow' },
  moderate: { surface: 'bg-crowdModerateSurface', dot: 'bg-crowdModerate', text: 'crowdModerate' },
  high: { surface: 'bg-crowdHighSurface', dot: 'bg-crowdHigh', text: 'crowdHigh' },
};

const NOISE_ICONS: Record<NoiseLevelId, IconName> = {
  1: 'volume-x',
  2: 'volume',
  3: 'volume-1',
  4: 'volume-2',
  5: 'volume-2',
};

interface LevelProps {
  levelId: number;
  /** Label from the API; falls back to src/constants/lookups */
  label?: string | null;
}

/** Crowdedness pill. Color, icon and label together, so it never relies on color alone. */
export function CrowdBadge({ levelId, label }: LevelProps) {
  const tone = CROWD_TONES[crowdTone(levelId)];
  const text = label ?? CROWD_LEVELS[levelId as CrowdLevelId] ?? 'Unknown';

  return (
    <View className={`flex-row items-center gap-xxs rounded-pill px-xs py-xxs ${tone.surface}`}>
      <View className={`h-2 w-2 rounded-pill ${tone.dot}`} />
      <Feather name="users" size={12} color={colors[tone.text]} />
      <Text variant="captionStrong" color={tone.text}>
        {text}
      </Text>
    </View>
  );
}

/** Noise level with a speaker icon. Neutral colors; only crowdedness gets status colors. */
export function NoiseTag({ levelId, label }: LevelProps) {
  const text = label ?? NOISE_LEVELS[levelId as NoiseLevelId] ?? 'Unknown';

  return (
    <View className="flex-row items-center gap-xxs">
      <Feather name={NOISE_ICONS[levelId as NoiseLevelId] ?? 'volume'} size={14} color={colors.textSecondary} />
      <Text variant="caption" color="textSecondary">
        {text}
      </Text>
    </View>
  );
}

/** Shown instead of crowd and noise when a spot has no post in the recent window. */
export function NoRecentUpdatesBadge() {
  return (
    <View className="flex-row items-center gap-xxs self-start rounded-pill border border-border bg-surface px-xs py-xxs">
      <Feather name="clock" size={12} color={colors.textSecondary} />
      <Text variant="captionStrong" color="textSecondary">
        No recent updates
      </Text>
    </View>
  );
}
