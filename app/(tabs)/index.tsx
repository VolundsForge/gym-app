import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { MyWorkoutsList } from '@/components/my-workouts-list';
import {
  Badge,
  Body,
  Button,
  Card,
  ConfirmDialog,
  Muted,
  Screen,
  Subtitle,
  Title,
  useScreenGutter,
  useTheme,
} from '@/components/ui';
import { Radius } from '@/constants/Colors';
import { useSettings } from '@/context/SettingsContext';
import { useWorkouts } from '@/context/WorkoutContext';
import {
  computeStats,
  formatDate,
  formatDayHeading,
  formatDuration,
} from '@/lib/stats';
import {
  formatExerciseCount,
  isComposingWorkout,
  isEmptyDraftWorkout,
  isLiveSessionWorkout,
  isLoggedWorkout,
  workoutFocus,
  workoutPhase,
} from '@/lib/workout-plan';
import type { WorkoutTemplate } from '@/types/workout';

const RECENT_TILE_GAP = 12;
/** Floor so a 2-line name, category pill, and two meta lines stay fully visible. */
const MIN_RECENT_TILE = 148;
/** Cap so 2-up tiles can be a bit roomy without turning into hollow squares. */
const MAX_RECENT_TILE_HEIGHT = 164;
const MAX_RECENT_COLUMNS = 10;

function recentTileWidth(contentWidth: number, columns: number): number {
  if (columns <= 1) return Math.max(0, Math.floor(contentWidth));
  return Math.floor(
    (contentWidth - RECENT_TILE_GAP * (columns - 1)) / columns
  );
}

function recentWorkoutColumns(contentWidth: number): number {
  if (contentWidth <= 0) return 2;
  const maxFit = Math.floor(
    (contentWidth + RECENT_TILE_GAP) / (MIN_RECENT_TILE + RECENT_TILE_GAP)
  );
  return Math.max(1, Math.min(MAX_RECENT_COLUMNS, maxFit));
}

function compactRecentDate(iso: string): string {
  const heading = formatDayHeading(iso);
  if (heading === 'Today' || heading === 'Yesterday') return heading;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function homeWelcome(
  displayName: string,
  workoutsThisWeek: number,
  returning: boolean
): { title: string; message: string } {
  const firstName = displayName.trim().split(/\s+/)[0];
  const title = returning
    ? firstName
      ? `Welcome back, ${firstName}!`
      : 'Welcome back!'
    : firstName
      ? `Welcome, ${firstName}!`
      : 'Welcome!';
  if (!returning || workoutsThisWeek <= 0) {
    return { title, message: '' };
  }
  if (workoutsThisWeek === 1) {
    return { title, message: "You've already trained once this week." };
  }
  return {
    title,
    message: `That's ${workoutsThisWeek} workouts this week already.`,
  };
}

export default function HomeScreen() {
  const theme = useTheme();
  const gutter = useScreenGutter();
  const { width: windowWidth } = useWindowDimensions();
  const { displayName, openedAppBefore } = useSettings();
  const {
    ready,
    workouts,
    activeWorkout,
    startWorkout,
    startFromTemplate,
    templates,
  } = useWorkouts();
  const [pendingTemplate, setPendingTemplate] = useState<WorkoutTemplate | null>(
    null
  );
  const [draggingWorkouts, setDraggingWorkouts] = useState(false);
  const [recentGridWidth, setRecentGridWidth] = useState(0);

  if (!ready) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={theme.tint} size="large" />
      </Screen>
    );
  }

  const logged = [...workouts]
    .filter(isLoggedWorkout)
    .sort(
      (a, b) =>
        new Date(b.finishedAt ?? b.startedAt).getTime() -
        new Date(a.finishedAt ?? a.startedAt).getTime()
    );
  const contentWidth =
    recentGridWidth > 0 ? recentGridWidth : windowWidth - gutter * 2;
  const recentColumns = recentWorkoutColumns(contentWidth);
  const recent = logged.slice(0, recentColumns * 2);
  const tileWidth = recentTileWidth(contentWidth, recentColumns);
  const tileHeight = Math.max(
    MIN_RECENT_TILE,
    Math.min(tileWidth, MAX_RECENT_TILE_HEIGHT)
  );
  const returning =
    openedAppBefore || logged.length > 0 || templates.length > 0;
  const welcome = homeWelcome(
    displayName,
    computeStats(workouts).workoutsThisWeek,
    returning
  );

  const composing =
    isComposingWorkout(activeWorkout) && !isEmptyDraftWorkout(activeWorkout);
  const inProgress = isLiveSessionWorkout(activeWorkout);
  const busy = inProgress || composing;

  const onCreate = () => {
    if (busy) {
      router.push('/workout/active');
      return;
    }
    startWorkout();
    router.push('/workout/active');
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        scrollEnabled={!draggingWorkouts}>
        <View style={styles.welcome}>
          <Title style={styles.welcomeTitle}>{welcome.title}</Title>
          {welcome.message ? <Subtitle>{welcome.message}</Subtitle> : null}
        </View>

        <MyWorkoutsList
          busy={busy}
          busyNote={
            inProgress
              ? 'Finish or discard the current workout to start one of these.'
              : 'Save or discard the workout you are creating to start one of these.'
          }
          onStart={setPendingTemplate}
          onCreate={onCreate}
          onDraggingChange={setDraggingWorkouts}
        />

        {inProgress && activeWorkout ? (
          <Card
            style={{
              gap: 12,
              borderColor: theme.tint,
              borderWidth: 1,
              backgroundColor: theme.tintMuted,
            }}>
            <Badge label="In progress" />
            <Body style={{ fontWeight: '700', fontSize: 18 }}>{activeWorkout.name}</Body>
            <Muted>
              Started {formatDate(activeWorkout.startedAt)} ·{' '}
              {activeWorkout.exercises.length} exercise
              {activeWorkout.exercises.length === 1 ? '' : 's'}
              {workoutPhase(activeWorkout) === 'review' ? ' · ready to finish' : ''}
            </Muted>
            <Button
              label={
                workoutPhase(activeWorkout) === 'review'
                  ? 'Review & finish'
                  : 'Continue workout'
              }
              onPress={() => router.push('/workout/active')}
            />
          </Card>
        ) : composing && activeWorkout ? (
          <Card
            style={{
              gap: 12,
              borderColor: theme.tint,
              borderWidth: 1,
              backgroundColor: theme.tintMuted,
            }}>
            <Badge label="Draft" />
            <Body style={{ fontWeight: '700', fontSize: 18 }}>
              {activeWorkout.name.trim() || 'New workout'}
            </Body>
            <Muted>
              {activeWorkout.exercises.length} exercise
              {activeWorkout.exercises.length === 1 ? '' : 's'}
              {activeWorkout.pendingExercise ? ' · adding one more' : ''}
              {' · save it to My Workouts when you are done'}
            </Muted>
            <Button
              label="Continue creating"
              onPress={() => router.push('/workout/active')}
            />
          </Card>
        ) : templates.length === 0 ? (
          <Card style={{ gap: 12 }}>
            <Body style={{ fontWeight: '700', fontSize: 18 }}>Ready to train?</Body>
            <Subtitle>
              Create a workout, add exercises, and save it to My Workouts. Start it
              from the list when you are ready to train.
            </Subtitle>
            <Button label="Create new workout" onPress={onCreate} />
          </Card>
        ) : null}

        {recent.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Body style={{ fontWeight: '700', fontSize: 18 }}>Recent workouts</Body>
            </View>
            <View
              style={styles.recentGrid}
              onLayout={(event) => {
                const width = Math.round(event.nativeEvent.layout.width);
                if (width > 0 && width !== recentGridWidth) {
                  setRecentGridWidth(width);
                }
              }}>
              {recent.map((workout) => {
                const when = workout.finishedAt ?? workout.startedAt;
                const focus = workoutFocus(workout);
                const exerciseCount = formatExerciseCount(
                  workout.exercises.length
                );
                return (
                  <Pressable
                    key={workout.id}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${workout.name}, ${focus}, ${exerciseCount}`}
                    onPress={() => router.push(`/workout/${workout.id}`)}
                    style={({ pressed }) => [
                      styles.recentTile,
                      {
                        width: tileWidth,
                        height: tileHeight,
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}>
                    <View style={styles.recentTop}>
                      <Body numberOfLines={2} style={styles.recentName}>
                        {workout.name}
                      </Body>
                      <Badge
                        label={focus}
                        nowrap
                        style={styles.recentFocusBadge}
                      />
                    </View>
                    <View style={styles.recentMeta}>
                      <Muted numberOfLines={1} style={styles.recentMetaLine}>
                        {exerciseCount}
                      </Muted>
                      <Muted numberOfLines={1} style={styles.recentMetaLine}>
                        {compactRecentDate(when)} ·{' '}
                        {formatDuration(workout.startedAt, workout.finishedAt)}
                      </Muted>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={!!pendingTemplate}
        title="Start this workout?"
        message={
          pendingTemplate
            ? `Are you sure you want to start ${pendingTemplate.name}?`
            : ''
        }
        onCancel={() => setPendingTemplate(null)}
        onConfirm={() => {
          if (!pendingTemplate) return;
          const template = pendingTemplate;
          setPendingTemplate(null);
          startFromTemplate(template);
          router.push('/workout/active');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
    gap: 16,
    paddingBottom: 40,
  },
  welcome: {
    gap: 4,
  },
  welcomeTitle: {
    fontSize: 26,
    lineHeight: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  recentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: RECENT_TILE_GAP,
  },
  recentTile: {
    flexGrow: 0,
    flexShrink: 0,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    justifyContent: 'space-between',
  },
  recentTop: {
    gap: 8,
    flexShrink: 0,
  },
  recentName: {
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 21,
    includeFontPadding: false,
  },
  recentMeta: {
    gap: 2,
    flexShrink: 0,
  },
  recentFocusBadge: {
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  recentMetaLine: {
    fontSize: 15,
    lineHeight: 20,
    includeFontPadding: false,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
