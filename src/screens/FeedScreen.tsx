import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';

import { FeedCard } from '@/components/feed/FeedCard';
import { Text } from '@/components/ui';
import { getCampusFeed, type FeedCursor, type FeedPost } from '@/lib/posts';
import { colors } from '@/theme';

type FeedFilter = 'all' | 'saved';

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: 'all', label: 'All spots' },
  { id: 'saved', label: 'Saved spots' },
];

export interface FeedScreenProps {
  onOpenSpot: (locationId: number) => void;
}

/** Feed tab (Figma "Spotted - Feed"): recent check-ins across campus, newest first, paged. */
export default function FeedScreen({ onOpenSpot }: FeedScreenProps) {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<FeedCursor | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each first-page load gets an id, so a slow response for an old filter can't overwrite a newer one
  const requestId = useRef(0);
  const hasLoaded = useRef(false);

  const loadFirstPage = useCallback(
    async (nextFilter: FeedFilter, { showSpinner = false }: { showSpinner?: boolean } = {}) => {
      const id = ++requestId.current;
      if (showSpinner) setRefreshing(true);
      try {
        const page = await getCampusFeed({ savedOnly: nextFilter === 'saved' });
        if (id !== requestId.current) return;
        setPosts(page.posts);
        setCursor(page.nextCursor);
        setError(null);
      } catch {
        if (id !== requestId.current) return;
        // A quiet refresh keeps the last list; only say so if nothing is shown or the user asked
        if (!hasLoaded.current || showSpinner) setError("Couldn't load the feed. Pull down to try again.");
      } finally {
        if (id === requestId.current) {
          hasLoaded.current = true;
          setLoaded(true);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  // Reload quietly whenever the tab regains focus, so new check-ins show up
  useFocusEffect(
    useCallback(() => {
      loadFirstPage(filter);
    }, [filter, loadFirstPage]),
  );

  const changeFilter = (next: FeedFilter) => {
    if (next === filter) return;
    setFilter(next);
    setPosts([]);
    setCursor(null);
    setError(null);
    hasLoaded.current = false;
    setLoaded(false);
    // useFocusEffect re-runs with the new filter and loads its first page
  };

  const refresh = () => loadFirstPage(filter, { showSpinner: true });

  const loadMore = async () => {
    if (!cursor || loadingMore || refreshing) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const page = await getCampusFeed({ cursor, savedOnly: filter === 'saved' });
      if (id !== requestId.current) return;
      setPosts((current) => {
        // The newest posts can shift between pages; skip any we already show
        const seen = new Set(current.map((post) => post.post_id));
        return [...current, ...page.posts.filter((post) => !seen.has(post.post_id))];
      });
      setCursor(page.nextCursor);
    } catch {
      // Leave the cursor alone; scrolling to the end again retries
    } finally {
      setLoadingMore(false);
    }
  };

  const header = (
    <View className="gap-md pb-sm pt-xl">
      <View className="gap-xxs">
        <Text variant="heading" accessibilityRole="header">
          What's happening on campus?
        </Text>
        <Text variant="caption" color="textSecondary">
          Recent study-spot updates from Northeastern students.
        </Text>
      </View>

      <View className="flex-row gap-xs" accessibilityRole="tablist">
        {FILTERS.map((option) => {
          const active = option.id === filter;
          return (
            <Pressable
              key={option.id}
              onPress={() => changeFilter(option.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className={`rounded-pill border px-md py-xs ${
                active ? 'border-primaryLight bg-primaryLight' : 'border-border bg-surface'
              }`}
            >
              <Text variant="caption" color={active ? 'textOnPrimaryLight' : 'textSecondary'}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row items-center justify-between">
        <Text variant="bodyStrong">Recent check-ins</Text>
        <Text variant="caption" color="textSecondary">
          Newest first
        </Text>
      </View>
    </View>
  );

  const empty = !loaded ? (
    <View className="items-center py-xl">
      <ActivityIndicator color={colors.primaryDark} />
    </View>
  ) : (
    <View className="rounded-xl border border-border bg-surface p-md">
      <Text variant="bodySmall" color="textSecondary">
        {error ??
          (filter === 'saved'
            ? 'No check-ins at your saved spots yet. Save a spot to see its updates here.'
            : 'No check-ins yet. Check in at a spot to get campus started.')}
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      {/* The tab's native header shows the title; Refresh goes in its right slot */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={refresh}
              disabled={refreshing}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Refresh feed"
            >
              <Text variant="caption">Refresh</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={posts}
        keyExtractor={(post) => String(post.post_id)}
        renderItem={({ item }) => <FeedCard post={item} onPress={onOpenSpot} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          <View className="py-lg">
            {loadingMore ? <ActivityIndicator color={colors.primaryDark} /> : null}
            {error && posts.length > 0 ? (
              <Text variant="caption" color="danger" className="text-center">
                {error}
              </Text>
            ) : null}
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-sm" />}
        contentContainerClassName="px-gutter"
        // Starts below the glass header (iOS 26) but scrolls up under it
        contentInsetAdjustmentBehavior="automatic"
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primaryDark} />
        }
      />
    </View>
  );
}
