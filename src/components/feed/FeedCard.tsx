import { Image, Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { formatTimeAgo } from '@/lib/formatTime';
import type { FeedPost } from '@/lib/posts';

interface FeedCardProps {
  post: FeedPost;
  onPress: (locationId: number) => void;
}

/** One check-in on the Feed tab (Figma "Spotted - Feed"): spot, photo, who and when, then the report. */
export function FeedCard({ post, onPress }: FeedCardProps) {
  const status = [post.crowd_level, post.noise_level].filter(Boolean).join(' · ');
  const author = post.author_name || 'Anonymous';

  return (
    <Pressable
      onPress={() => onPress(post.location_id)}
      accessibilityRole="button"
      accessibilityLabel={`${post.location_name}, ${status}, ${formatTimeAgo(post.created_at)}`}
      accessibilityHint="Opens this spot"
      className="gap-sm rounded-xl border border-border bg-surface p-md active:opacity-80"
    >
      <Text variant="heading" numberOfLines={1}>
        {post.location_name}
      </Text>

      <View className="h-[68px] overflow-hidden rounded-md bg-primaryLight">
        {post.photo_url ? (
          <Image
            source={{ uri: post.photo_url }}
            className="h-full w-full"
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>

      <View className="flex-row items-center justify-between gap-sm">
        <Text variant="caption" color="textSecondary" numberOfLines={1} className="flex-1">
          {author}
        </Text>
        <Text variant="caption" color="textSecondary">
          {formatTimeAgo(post.created_at)}
        </Text>
      </View>

      <View className="gap-xxs">
        <Text variant="captionStrong">{status}</Text>
        {post.caption ? (
          <Text variant="caption" color="textSecondary">
            {post.caption}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
