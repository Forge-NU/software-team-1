import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useBottomSheetGestureHandlers } from '@gorhom/bottom-sheet';
import {
    Gesture,
    GestureDetector,
    type GestureStateChangeEvent,
    type GestureUpdateEvent,
    type PanGestureChangeEventPayload,
    type PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import Animated, {
    scrollTo,
    useAnimatedRef,
    useAnimatedScrollHandler,
    useSharedValue,
    type SharedValue,
} from 'react-native-reanimated';

/** How close to the top or bottom of the list still counts as being there */
const EDGE_SLOP = 1;
/** How far the finger moves toward the edge, while the list is there, before the sheet takes over */
const HANDOFF_DISTANCE = 2;

type PanEvent = GestureStateChangeEvent<PanGestureHandlerEventPayload>;
type PanChangeEvent = GestureUpdateEvent<PanGestureHandlerEventPayload & PanGestureChangeEventPayload>;

interface SheetScrollAreaProps {
    /** The sheet's live index (gorhom's animatedIndex) */
    animatedIndex: SharedValue<number>;
    /** The sheet's tallest snap point index */
    maxIndex: number;
    /** Turn off dragging the sheet from the list, e.g. while it's locked at full height */
    sheetDragEnabled?: boolean;
    style?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
    keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
    keyboardDismissMode?: 'none' | 'on-drag' | 'interactive';
    children: ReactNode;
}

/**
 * A scroll view for a gorhom bottom sheet whose content panning is turned off, that behaves like an
 * iOS sheet's list: dragging it scrolls the list at any sheet height, with the usual bounce. When
 * the finger is dragging down with the list at its top (or up with it at its bottom), whether from
 * the start of the drag or after scrolling there, the sheet takes over and follows the finger.
 * A fling that reaches the end after the finger lifts just bounces, and never moves the sheet.
 *
 * The sheet is moved with gorhom's own handle gesture handlers, so it tracks the finger and snaps
 * exactly as it does when dragged by its handle. Must be rendered inside the BottomSheet.
 */
export default function SheetScrollArea({
    animatedIndex,
    maxIndex,
    sheetDragEnabled = true,
    style,
    contentContainerStyle,
    keyboardShouldPersistTaps,
    keyboardDismissMode,
    children,
}: SheetScrollAreaProps) {
    const { handlePanGestureHandler } = useBottomSheetGestureHandlers();
    const scrollRef = useAnimatedRef<Animated.ScrollView>();

    // The list's scroll position and how far it can scroll, kept on the UI thread
    const scrollY = useSharedValue(0);
    const viewportHeight = useSharedValue(0);
    const contentHeight = useSharedValue(0);

    // While the sheet is following the finger, the list is held at this offset (its top or bottom),
    // so it doesn't scroll or bounce at the same time
    const sheetDragging = useSharedValue(false);
    const heldOffset = useSharedValue(0);

    const onScroll = useAnimatedScrollHandler((event) => {
        viewportHeight.value = event.layoutMeasurement.height;
        contentHeight.value = event.contentSize.height;
        if (sheetDragging.value) {
            if (event.contentOffset.y !== heldOffset.value) scrollTo(scrollRef, 0, heldOffset.value, false);
            return;
        }
        scrollY.value = event.contentOffset.y;
    });

    // The finger's last position, and how far it has moved toward an edge while the list is there
    const lastY = useSharedValue(0);
    const pullDown = useSharedValue(0);
    const pushUp = useSharedValue(0);
    // The pan's translation when the sheet took over: the sheet moves by what comes after it, so a
    // handoff partway through a drag doesn't make it jump by the distance already scrolled
    const translationAtHandoff = useSharedValue(0);

    const scrollGesture = Gesture.Native();

    const sheetGesture = Gesture.Pan()
        .enabled(sheetDragEnabled)
        .manualActivation(true)
        .shouldCancelWhenOutside(false)
        .simultaneousWithExternalGesture(scrollGesture)
        .onTouchesDown((event) => {
            const touch = event.allTouches[0];
            if (!touch) return;
            lastY.value = touch.absoluteY;
            pullDown.value = 0;
            pushUp.value = 0;
        })
        .onTouchesMove((event, manager) => {
            if (sheetDragging.value) return;
            const touch = event.allTouches[0];
            if (!touch) return;
            const dy = touch.absoluteY - lastY.value;
            lastY.value = touch.absoluteY;

            const maxScroll = Math.max(0, contentHeight.value - viewportHeight.value);
            const atTop = scrollY.value <= EDGE_SLOP;
            const atBottom = scrollY.value >= maxScroll - EDGE_SLOP;
            const canShrink = animatedIndex.value > 0.01;
            const canGrow = animatedIndex.value < maxIndex - 0.01;

            // Count movement toward an edge only while the list is at it; anything else resets
            pullDown.value = atTop && canShrink && dy > 0 ? pullDown.value + dy : 0;
            pushUp.value = atBottom && canGrow && dy < 0 ? pushUp.value - dy : 0;

            if (pullDown.value >= HANDOFF_DISTANCE || pushUp.value >= HANDOFF_DISTANCE) {
                heldOffset.value = pullDown.value > 0 ? 0 : maxScroll;
                sheetDragging.value = true;
                scrollTo(scrollRef, 0, heldOffset.value, false);
                manager.activate();
            }
        })
        .onTouchesUp((_event, manager) => {
            if (!sheetDragging.value) manager.fail();
        })
        .onTouchesCancelled((_event, manager) => {
            if (!sheetDragging.value) manager.fail();
        })
        .onStart((event: PanEvent) => {
            translationAtHandoff.value = event.translationY;
            handlePanGestureHandler.handleOnStart({ ...event, translationY: 0 });
        })
        .onChange((event: PanChangeEvent) => {
            handlePanGestureHandler.handleOnChange({
                ...event,
                translationY: event.translationY - translationAtHandoff.value,
            });
        })
        .onEnd((event: PanEvent) => {
            handlePanGestureHandler.handleOnEnd({
                ...event,
                translationY: event.translationY - translationAtHandoff.value,
            });
        })
        .onFinalize((event: PanEvent) => {
            if (sheetDragging.value) {
                handlePanGestureHandler.handleOnFinalize({
                    ...event,
                    translationY: event.translationY - translationAtHandoff.value,
                });
                // The list was held here while the sheet moved
                scrollY.value = heldOffset.value;
            }
            sheetDragging.value = false;
        });

    return (
        <GestureDetector gesture={sheetGesture}>
            <View style={[styles.fill, style]}>
                <GestureDetector gesture={scrollGesture}>
                    <Animated.ScrollView
                        ref={scrollRef}
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                        onLayout={(e) => { viewportHeight.value = e.nativeEvent.layout.height; }}
                        onContentSizeChange={(_w, h) => { contentHeight.value = h; }}
                        contentContainerStyle={contentContainerStyle}
                        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
                        keyboardDismissMode={keyboardDismissMode}
                    >
                        {children}
                    </Animated.ScrollView>
                </GestureDetector>
            </View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1 },
});
