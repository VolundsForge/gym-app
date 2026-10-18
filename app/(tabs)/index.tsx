import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
  useTheme,
} from '@/components/ui';
import { useWorkouts } from '@/context/WorkoutContext';
import { formatDate } from '@/lib/stats';
import {
  formatWorkoutListMeta,
  isComposingWorkout,
  isEmptyDraftWorkout,
  isLiveSessionWorkout,
  isLoggedWorkout,
  workoutPhase,
} from '@/lib/workout-plan';
import type { WorkoutTemplate } from '@/types/workout';

export default function HomeScreen() {
  const theme = useTheme();
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

  if (!ready) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={theme.tint} size="large" />
      </Screen>
    );
  }

  const logged = workouts.filter(isLoggedWorkout);
  const recent = logged.slice(0, 3);

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
        <View style={styles.header}>
          <Subtitle>
            Log sets and reps. Watch your growth over time.
          </Subtitle>
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
            {recent.map((workout) => {
              return (
                <Card key={workout.id} style={{ gap: 6 }}>
                  <View style={styles.rowBetween}>
                    <Body style={{ fontWeight: '700', flex: 1 }}>{workout.name}</Body>
                    <Muted>{formatDate(workout.finishedAt ?? workout.startedAt)}</Muted>
                  </View>
                  <Muted>{formatWorkoutListMeta(workout)}</Muted>
                  <Button
                    label="View details"
                    variant="secondary"
                    onPress={() => router.push(`/workout/${workout.id}`)}
                    style={{ marginTop: 8 }}
                  />
                </Card>
              );
            })}
            <Pressable
              onPress={() => router.push('/history')}
              hitSlop={6}
              style={{ paddingVertical: 4 }}>
              <Muted style={{ color: theme.tint, fontWeight: '600' }}>
                {logged.length > 3
                  ? 'See all workouts in History'
                  : 'Open History'}
              </Muted>
            </Pressable>
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
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  header: {
    gap: 6,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
