import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { ALREADY_REPORTED, reportPost } from '../lib/flags';
import { getLocation, getSeatingInfo } from '../lib/places';
import type { SeatingInfo } from '../lib/places';
import { getRecentPhotos } from '../lib/posts';
import type { RecentPhoto } from '../lib/posts';
import { getPostsWithVotes, setVote } from '../lib/votes';
import type { PostWithVotes, VoteValue } from '../lib/votes';
import type { Location } from '../types/location';

/** Reporting twice isn't an error for the user, so it comes back as its own result. */
export type ReportResult = 'reported' | 'already_reported';

/** Loads everything the spot screen shows, and handles voting on and reporting its updates. */
export function useSpotDetails(locationId: number) {
  const [location, setLocation] = useState<Location | null>(null);
  const [posts, setPosts] = useState<PostWithVotes[]>([]);
  const [photos, setPhotos] = useState<RecentPhoto[]>([]);
  const [seating, setSeating] = useState<SeatingInfo[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
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
    load();
  }, [locationId]);

  /** Tapping your current vote again removes it. */
  async function vote(postId: number, selectedVote: 1 | -1) {
    const post = posts.find((item) => item.post_id === postId);

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

  /** Reports a post. Throws on any other failure, so the sheet can offer a retry. */
  async function report(postId: number, reason: string): Promise<ReportResult> {
    try {
      await reportPost(postId, reason);
      return 'reported';
    } catch (error) {
      if (error instanceof Error && error.message === ALREADY_REPORTED) return 'already_reported';
      console.error('Could not report post:', error);
      throw error;
    }
  }

  return { location, posts, photos, seating, loading, vote, report };
}
