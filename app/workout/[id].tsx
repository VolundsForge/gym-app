import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  Body,
  Button,
  Card,
  EmptyState,
  Muted,
  Screen,
  Subtitle,
  useTheme,
} from '@/components/ui';
import { useWorkouts } from '@/context/WorkoutContext';
import {
  formatDate,
  formatDuration,
  formatTime,
  workoutVolume,
} from '@/lib/stats';

export default function WorkoutDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getWorkout, deleteWorkout } = useWorkouts();
  const workout = id ? getWorkout(id) : undefined;

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

  const onDelete = () => {
    Alert.alert('Delete workout?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWorkout(workout.id);
          router.replace('/history');
        },
      },
    ]);
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
            <Stat label="Sets" value={String(completedSets)} />
            <Stat label="Volume" value={`${Math.round(workoutVolume(workout))} kg`} />
          </View>
        </Card>

        {workout.exercises.map((exercise) => (
          <Card key={exercise.id} style={{ gap: 10 }}>
            <View style={styles.rowBetween}>
              <Body style={{ fontWeight: '700', fontSize: 17, flex: 1 }}>
                {exercise.exerciseName}
              </Body>
              <Badge label={exercise.muscleGroup} />
            </View>
            {exercise.sets.map((set, index) => (
              <View
                key={set.id}
                style={[
                  styles.setRow,
                  {
                    backgroundColor: set.completed ? theme.muted : 'transparent',
                    opacity: set.completed ? 1 : 0.55,
                  },
                ]}>
                <Muted style={{ width: 48 }}>Set {index + 1}</Muted>
                <Body style={{ flex: 1, fontWeight: '600' }}>
                  {set.weight} kg × {set.reps} reps
                </Body>
                <Muted>{set.completed ? 'Done' : 'Skipped'}</Muted>
              </View>
            ))}
          </Card>
        ))}

        <Button label="Delete workout" variant="danger" onPress={onDelete} />
      </ScrollView>
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
    padding: 20,
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
