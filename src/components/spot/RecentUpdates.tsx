import React from 'react';
import { Text, View } from 'react-native';

import type { SeatingInfo } from '../../lib/places';
import { formatTimeAgo } from '../../lib/formatTime';
import { isStale, outletLevelForPost } from '../../lib/spot';
import type { PostWithVotes } from '../../lib/votes';
import { spotStyles } from './styles';
import UpdateCard from './UpdateCard';

interface RecentUpdatesProps {
  /** Newest first. */
  posts: PostWithVotes[];
  seating: SeatingInfo[];
  onVote: (postId: number, vote: 1 | -1) => void;
  onReport: (postId: number) => void;
  /** The signed-in user, so Report is hidden on their own updates */
  myUserId?: string;
}

/** All updates, newest first. Says so when none are recent, and labels older ones outdated. */
export default function RecentUpdates({
  posts,
  seating,
  onVote,
  onReport,
  myUserId,
}: RecentUpdatesProps) {
  const hasFreshPosts = posts.some((post) => !isStale(post.created_at));

  return (
    <View style={spotStyles.section}>
      <Text style={spotStyles.sectionTitle}>Recent updates</Text>

      {!hasFreshPosts && (
        <Text style={spotStyles.emptyText}>
          {posts.length > 0
            ? `No recent updates. The last report was ${formatTimeAgo(posts[0].created_at)}.`
            : 'No recent updates for this spot yet.'}
        </Text>
      )}

      {posts.map((post) => (
        <UpdateCard
          key={post.post_id}
          post={post}
          outletLevel={outletLevelForPost(seating, post)}
          onVote={onVote}
          onReport={post.user_id === myUserId ? undefined : onReport}
        />
      ))}
    </View>
  );
}
