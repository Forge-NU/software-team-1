import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { formatTimeAgo } from '../../lib/formatTime';
import type { RecentPhoto } from '../../lib/posts';
import { colors, spacing, typography } from '../../theme';

interface PhotoViewerProps {
  photos: RecentPhoto[];
  /** The photo to show, or null when the viewer is closed. */
  startIndex: number | null;
  onClose: () => void;
}

/** Photos full screen on black. Swipe sideways between them; who posted each is along the bottom. */
export default function PhotoViewer({ photos, startIndex, onClose }: PhotoViewerProps) {
  const { width } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex ?? 0);

  useEffect(() => {
    if (startIndex !== null) setIndex(startIndex);
  }, [startIndex]);

  const photo = photos[index];

  return (
    <Modal
      visible={startIndex !== null}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {startIndex !== null && (
          <FlatList
            data={photos}
            keyExtractor={(item) => String(item.photo_id)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={startIndex}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(event) =>
              setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
            }
            renderItem={({ item }) => (
              <Image source={{ uri: item.url }} style={{ width }} resizeMode="contain" />
            )}
          />
        )}

        <View style={[styles.topBar, { top: top + spacing.xs }]}>
          <Text style={styles.count}>
            {index + 1} of {photos.length}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
            style={styles.close}
          >
            <Feather name="x" size={22} color={colors.textOnPrimary} />
          </Pressable>
        </View>

        {photo && (
          <View style={[styles.info, { paddingBottom: bottom + spacing.md }]}>
            <Text style={styles.author}>
              {photo.author_name || 'Anonymous'} · {formatTimeAgo(photo.created_at)}
            </Text>
            {photo.caption ? <Text style={styles.caption}>{photo.caption}</Text> : null}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.shadow,
  },
  topBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  count: {
    ...typography.label,
    color: colors.textOnPrimary,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xxs,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  author: {
    ...typography.label,
    color: colors.textOnPrimary,
  },
  caption: {
    ...typography.bodySmall,
    color: colors.textOnPrimary,
  },
});
