import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Body, ConfirmDialog, Muted, useTheme } from '@/components/ui';
import { Radius } from '@/constants/Colors';
import { useWorkouts } from '@/context/WorkoutContext';
import type { WorkoutTemplate } from '@/types/workout';

const ROW_GAP = 10;
const FALLBACK_ROW = 84;
const HOLD_MS = 1000;
const HOLD_WHILE_EDITING_MS = 220;

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function jiggleSeed(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n += id.charCodeAt(i) * (i + 3);
  return n % 220;
}

const WIGGLE_EASE = Easing.inOut(Easing.sin);

function slotShift(index: number, dragIndex: number | null, hoverIndex: number | null, span: number) {
  if (dragIndex == null || hoverIndex == null || dragIndex === hoverIndex) return 0;
  if (dragIndex < hoverIndex && index > dragIndex && index <= hoverIndex) return -span;
  if (dragIndex > hoverIndex && index >= hoverIndex && index < dragIndex) return span;
  return 0;
}

export function MyWorkoutsList({
  busy,
  busyNote,
  onStart,
  onCreate,
  onDraggingChange,
}: {
  busy: boolean;
  busyNote?: string;
  onStart: (template: WorkoutTemplate) => void;
  onCreate?: () => void;
  onDraggingChange?: (dragging: boolean) => void;
}) {
  const theme = useTheme();
  const { templates, deleteTemplate, reorderTemplates } = useWorkouts();
  const [editing, setEditing] = useState(false);
  const [order, setOrder] = useState(templates);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WorkoutTemplate | null>(null);
  const [removing, setRemoving] = useState(false);
  const dragY = useSharedValue(0);
  const heightsRef = useRef<Record<string, number>>({});
  const orderRef = useRef(order);
  const dragIdRef = useRef<string | null>(null);
  const hoverRef = useRef<number | null>(null);

  orderRef.current = order;
  dragIdRef.current = dragId;
  hoverRef.current = hoverIndex;

  useEffect(() => {
    if (dragId) return;
    setOrder(templates);
  }, [templates, dragId]);

  useEffect(() => {
    if (templates.length === 0 && editing) setEditing(false);
  }, [templates.length, editing]);

  const spanFor = useCallback((id: string) => {
    return (heightsRef.current[id] ?? FALLBACK_ROW) + ROW_GAP;
  }, []);

  const pickUp = useCallback(
    (id: string) => {
      const index = orderRef.current.findIndex((item) => item.id === id);
      if (index < 0) return;
      setEditing(true);
      setDragId(id);
      setHoverIndex(index);
      dragY.value = 0;
      onDraggingChange?.(true);
    },
    [dragY, onDraggingChange]
  );

  const dragMove = useCallback(
    (id: string, dy: number) => {
      const list = orderRef.current;
      const from = list.findIndex((item) => item.id === id);
      if (from < 0) return;
      const span = spanFor(id);
      const to = Math.max(0, Math.min(list.length - 1, from + Math.round(dy / span)));
      if (to !== hoverRef.current) setHoverIndex(to);
    },
    [spanFor]
  );

  const drop = useCallback(() => {
    const id = dragIdRef.current;
    if (!id) return;
    const from = orderRef.current.findIndex((item) => item.id === id);
    const to = hoverRef.current ?? from;
    dragIdRef.current = null;
    setDragId(null);
    setHoverIndex(null);
    onDraggingChange?.(false);
    dragY.value = 0;
    if (from < 0 || to < 0 || from === to) return;
    const next = moveItem(orderRef.current, from, to);
    setOrder(next);
    void reorderTemplates(next.map((item) => item.id));
  }, [dragY, onDraggingChange, reorderTemplates]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || removing) return;
    setRemoving(true);
    try {
      await deleteTemplate(pendingDelete.id);
      setPendingDelete(null);
    } finally {
      setRemoving(false);
    }
  }, [deleteTemplate, pendingDelete, removing]);

  if (templates.length === 0) return null;

  const dragIndex = dragId ? order.findIndex((item) => item.id === dragId) : null;
  const dragSpan = dragId ? spanFor(dragId) : FALLBACK_ROW + ROW_GAP;

  return (
    <GestureHandlerRootView style={{ gap: 8 }}>
      <View style={styles.sectionHeader}>
        <Body style={{ fontWeight: '700', fontSize: 18, flex: 1 }}>My Workouts</Body>
        {editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Done editing workouts"
            onPress={() => setEditing(false)}
            hitSlop={8}
            style={{ paddingVertical: 4, paddingHorizontal: 4 }}>
            <Body style={{ color: theme.tint, fontWeight: '700', fontSize: 18 }}>Done</Body>
          </Pressable>
        ) : onCreate ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create new workout"
            onPress={onCreate}
            hitSlop={8}
            style={styles.addHit}>
            <Ionicons name="add" size={42} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>
      {busy && !editing && busyNote ? <Muted>{busyNote}</Muted> : null}
      {editing ? (
        <Muted>Drag to reorder. Tap the red cross to remove.</Muted>
      ) : null}
      <View style={styles.list}>
        {order.map((template, index) => (
          <TemplateRow
            key={template.id}
            template={template}
            editing={editing}
            dragging={dragId === template.id}
            shiftY={slotShift(index, dragIndex, hoverIndex, dragSpan)}
            dragY={dragY}
            playDisabled={busy}
            onPickUp={pickUp}
            onDragMove={dragMove}
            onEnterEdit={() => setEditing(true)}
            onDrop={drop}
            onStart={() => onStart(template)}
            onRequestDelete={() => setPendingDelete(template)}
            onLayoutHeight={(height) => {
              heightsRef.current[template.id] = height;
            }}
          />
        ))}
      </View>

      <ConfirmDialog
        visible={!!pendingDelete}
        title="Remove this workout?"
        message={
          pendingDelete
            ? `${pendingDelete.name} will be removed from My Workouts. Your history stays as it is.`
            : ''
        }
        danger
        loading={removing}
        confirmLabel="Remove"
        onCancel={() => {
          if (!removing) setPendingDelete(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </GestureHandlerRootView>
  );
}

function TemplateRow({
  template,
  editing,
  dragging,
  shiftY,
  dragY,
  playDisabled,
  onPickUp,
  onDragMove,
  onEnterEdit,
  onDrop,
  onStart,
  onRequestDelete,
  onLayoutHeight,
}: {
  template: WorkoutTemplate;
  editing: boolean;
  dragging: boolean;
  shiftY: number;
  dragY: SharedValue<number>;
  playDisabled: boolean;
  onPickUp: (id: string) => void;
  onDragMove: (id: string, dy: number) => void;
  onEnterEdit: () => void;
  onDrop: () => void;
  onStart: () => void;
  onRequestDelete: () => void;
  onLayoutHeight: (height: number) => void;
}) {
  const theme = useTheme();
  const tilt = useSharedValue(0);
  const sway = useSharedValue(0);
  const preview = template.exercises
    .slice(0, 3)
    .map((ex) => ex.exerciseName)
    .join(' · ');
  const extra =
    template.exercises.length > 3 ? ` +${template.exercises.length - 3}` : '';

  useEffect(() => {
    if (editing && !dragging) {
      const seed = jiggleSeed(template.id);
      tilt.value = -1;
      sway.value = 1;
      tilt.value = withDelay(
        seed,
        withRepeat(
          withTiming(1, { duration: 560, easing: WIGGLE_EASE }),
          -1,
          true
        )
      );
      sway.value = withDelay(
        seed,
        withRepeat(
          withTiming(-1, { duration: 680, easing: WIGGLE_EASE }),
          -1,
          true
        )
      );
      return () => {
        cancelAnimation(tilt);
        cancelAnimation(sway);
        tilt.value = 0;
        sway.value = 0;
      };
    }
    cancelAnimation(tilt);
    cancelAnimation(sway);
    tilt.value = withTiming(0, { duration: 160, easing: WIGGLE_EASE });
    sway.value = withTiming(0, { duration: 160, easing: WIGGLE_EASE });
    return undefined;
  }, [editing, dragging, template.id, tilt, sway]);

  const pan = useMemo(() => {
    const id = template.id;
    return Gesture.Pan()
      .activateAfterLongPress(editing ? HOLD_WHILE_EDITING_MS : HOLD_MS)
      .onStart(() => {
        runOnJS(onPickUp)(id);
      })
      .onUpdate((event) => {
        dragY.value = event.translationY;
        runOnJS(onDragMove)(id, event.translationY);
      })
      .onFinalize(() => {
        runOnJS(onDrop)();
      });
  }, [dragY, editing, onDragMove, onDrop, onPickUp, template.id]);

  const animatedStyle = useAnimatedStyle(() => {
    const y = dragging ? dragY.value : shiftY;
    const rotate = dragging ? 0 : tilt.value * 0.55;
    const x = dragging ? 0 : sway.value * 0.6;
    const scale = dragging ? 1.03 : 1;
    return {
      transform: [
        { translateY: y },
        { translateX: x },
        { rotate: `${rotate}deg` },
        { scale },
      ],
      zIndex: dragging ? 20 : 1,
    };
  }, [dragging, shiftY]);

  return (
    <Animated.View
      style={[
        styles.rowWrap,
        animatedStyle,
        dragging
          ? Platform.OS === 'web'
            ? { boxShadow: '0 10px 28px rgba(28,28,28,0.18)' }
            : { elevation: 8 }
          : null,
      ]}
      onLayout={(event) => onLayoutHeight(event.nativeEvent.layout.height)}>
      {editing ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${template.name}`}
          onPress={onRequestDelete}
          hitSlop={6}
          style={styles.deleteHit}>
          <View style={[styles.deleteBadge, { backgroundColor: theme.danger }]}>
            <Ionicons name="close" size={13} color="#FCFBF8" />
          </View>
        </Pressable>
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.templateRow,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              opacity: playDisabled && !editing ? 0.55 : 1,
            },
            Platform.OS === 'web' ? { userSelect: 'none' as const } : null,
          ]}>
          <View style={{ flex: 1, gap: 4, paddingRight: 10 }}>
            <Body style={{ fontWeight: '700', fontSize: 18 }}>{template.name}</Body>
            <Muted numberOfLines={1} style={{ fontSize: 14 }}>
              {template.exercises.length} exercise
              {template.exercises.length === 1 ? '' : 's'}
              {preview ? ` · ${preview}${extra}` : ''}
            </Muted>
          </View>
          {editing ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Start ${template.name}`}
              disabled={playDisabled}
              onPress={onStart}
              onLongPress={onEnterEdit}
              delayLongPress={HOLD_MS}
              hitSlop={6}
              style={({ pressed }) => [
                styles.playButton,
                {
                  backgroundColor: theme.primary,
                  opacity: playDisabled ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}>
              <Ionicons
                name="play"
                size={20}
                color={theme.onPrimary}
                style={{ marginLeft: 2 }}
              />
            </Pressable>
          )}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  list: {
    gap: ROW_GAP,
    overflow: 'visible',
    paddingTop: 10,
    paddingLeft: 8,
    marginLeft: -8,
    marginTop: -10,
  },
  rowWrap: {
    position: 'relative',
    overflow: 'visible',
    pointerEvents: 'box-none',
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
    paddingHorizontal: 18,
    minHeight: 76,
  },
  playButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addHit: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  deleteHit: {
    position: 'absolute',
    top: -8,
    left: -8,
    zIndex: 30,
    elevation: 9,
  },
  deleteBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
