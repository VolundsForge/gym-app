import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Body,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Muted,
  MuscleTags,
  Screen,
  Subtitle,
  useTheme,
} from '@/components/ui';
import { useSettings } from '@/context/SettingsContext';
import { useWorkouts } from '@/context/WorkoutContext';
import {
  formatClockSeconds,
  formatDate,
  formatDuration,
  formatTime,
  workoutVolume,
} from '@/lib/stats';
import { isTimedExercise, usesWeight } from '@/lib/workout-plan';
import { formatWeight } from '@/lib/weight';
import { indexById } from '@/lib/id';

export default function WorkoutDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { weightUnit } = useSettings();
  const { getWorkout, deleteWorkout, exercises, activeWorkout, startFromWorkout } =
    useWorkouts();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const workout = id ? getWorkout(id) : undefined;
  const catalogById = useMemo(() => indexById(exercises), [exercises]);

  if (!workout) {
    return (
      <Screen style={styles.centered}>
        <EmptyState
          title="Workout not found"
          message="It may have been deleted."
          actionLabel="Back to history"
          onAction={() => router.replace('/history')}
        />
      </Screen>
    );
  }

  const completedSets = workout.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.completed).length,
    0
  );
  const volume = workoutVolume(workout);

  const onDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteWorkout(workout.id);
      setConfirmDelete(false);
      router.replace('/history');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: workout.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ gap: 8 }}>
          <Body style={{ fontWeight: '700', fontSize: 22 }}>{workout.name}</Body>
          <Subtitle>
            {formatDate(workout.finishedAt ?? workout.startedAt)} ·{' '}
            {formatTime(workout.startedAt)}
            {workout.finishedAt ? ` – ${formatTime(workout.finishedAt)}` : ''}
          </Subtitle>
          <View style={styles.statsRow}>
            <Stat label="Duration" value={formatDuration(workout.startedAt, workout.finishedAt)} />
            <Stat label="Exercises" value={String(workout.exercises.length)} />
            {completedSets > 0 ? (
              <Stat label="Sets" value={String(completedSets)} />
            ) : null}
            {volume > 0 ? (
              <Stat
                label="Volume"
                value={formatWeight(volume, weightUnit)}
              />
            ) : null}
          </View>
        </Card>

        {workout.exercises.map((exercise) => {
          const catalog = catalogById.get(exercise.exerciseId);
          return (
            <Card key={exercise.id} style={{ gap: 10 }}>
              <View style={{ gap: 8 }}>
                <Body style={{ fontWeight: '700', fontSize: 17 }}>
                  {exercise.exerciseName}
                </Body>
                <MuscleTags
                  primary={exercise.muscleGroup}
                  secondary={
                    exercise.secondaryMuscleGroups ??
                    catalog?.secondaryMuscleGroups
                  }
                />
              </View>
              {exercise.notes ? <Subtitle>{exercise.notes}</Subtitle> : null}
              {isTimedExercise(exercise) ? (
                <View
                  style={[
                    styles.setRow,
                    {
                      backgroundColor: theme.muted,
                      opacity: 1,
                    },
                  ]}>
                  <Muted style={{ width: 48 }}>Time</Muted>
                  <Body style={{ flex: 1, fontWeight: '600' }}>
                    {formatClockSeconds(exercise.durationSeconds ?? 0)}
                  </Body>
                  <Muted>{exercise.completed ? 'Done' : 'Open'}</Muted>
                </View>
              ) : (
                exercise.sets.map((set, index) => (
                  <View
                    key={set.id}
                    style={[
                      styles.setRow,
                      {
                        backgroundColor: set.completed
                          ? theme.muted
                          : 'transparent',
                        opacity: set.completed ? 1 : 0.55,
                      },
                    ]}>
                    <Muted style={{ width: 48 }}>Set {index + 1}</Muted>
                    <Body style={{ flex: 1, fontWeight: '600' }}>
                      {usesWeight(
                        catalog?.equipment ?? exercise.equipment,
                        exercise.muscleGroup
                      )
                        ? `${formatWeight(set.weight, weightUnit)} × ${set.reps} reps`
                        : `${set.reps} reps`}
                    </Body>
                    <Muted>{set.completed ? 'Done' : 'Skipped'}</Muted>
                  </View>
                ))
              )}
            </Card>
          );
        })}

        <Button
          label={activeWorkout ? 'Continue current workout' : 'Repeat this workout'}
          onPress={() => {
            if (activeWorkout) {
              router.push('/workout/active');
              return;
            }
            startFromWorkout(workout);
            router.push('/workout/active');
          }}
        />
        <Button
          label="Delete workout"
          variant="danger"
          onPress={() => setConfirmDelete(true)}
        />
      </ScrollView>
      <ConfirmDialog
        visible={confirmDelete}
        title="Delete this workout?"
        message={`Are you sure you want to delete ${workout.name}? It will be removed from your history.`}
        confirmLabel="Yes"
        cancelLabel="No"
        danger
        loading={deleting}
        onCancel={() => {
          if (!deleting) setConfirmDelete(false);
        }}
        onConfirm={() => void onDelete()}
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '47%', marginBottom: 8 }}>
      <Muted>{label}</Muted>
      <Body style={{ fontWeight: '700', marginTop: 2 }}>{value}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 20,
    gap: 12,
    paddingBottom: 40,
  },
  centered: {
    justifyContent: 'center',
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
});
