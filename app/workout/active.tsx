import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import {
  Badge,
  Body,
  Button,
  Card,
  EmptyState,
  Input,
  Muted,
  Screen,
  Subtitle,
  Title,
  useTheme,
} from '@/components/ui';
import { useWorkouts } from '@/context/WorkoutContext';
import { formatDuration } from '@/lib/stats';
import type { Exercise } from '@/types/workout';

export default function ActiveWorkoutScreen() {
  const theme = useTheme();
  const {
    activeWorkout,
    updateActiveWorkout,
    addSet,
    updateSet,
    removeSet,
    removeExerciseFromActive,
    replaceExerciseInActive,
    getAlternatives,
    finishWorkout,
    discardActiveWorkout,
  } = useWorkouts();

  const [tick, setTick] = useState(0);
  const [swapFor, setSwapFor] = useState<{
    workoutExerciseId: string;
    exerciseId: string;
    name: string;
    muscleGroup: string;
  } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  if (!activeWorkout) {
    return (
      <Screen style={styles.centered}>
        <EmptyState
          title="No active workout"
          message="Start a session from the Home tab."
          actionLabel="Go home"
          onAction={() => router.replace('/')}
        />
      </Screen>
    );
  }

  // keep duration label reactive every 30s
  void tick;

  const onFinish = () => {
    const completedSets = activeWorkout.exercises.reduce(
      (n, ex) => n + ex.sets.filter((s) => s.completed).length,
      0
    );
    if (completedSets === 0) {
      Alert.alert(
        'No completed sets',
        'Mark at least one set as done, or discard this workout.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert('Finish workout?', 'This session will be saved to your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish',
        onPress: async () => {
          const finished = await finishWorkout();
          if (finished) {
            router.replace(`/workout/${finished.id}`);
          }
        },
      },
    ]);
  };

  const onDiscard = () => {
    Alert.alert('Discard workout?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await discardActiveWorkout();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: activeWorkout.name,
          headerRight: () => (
            <Pressable onPress={onFinish} style={{ marginRight: 4 }}>
              <Body style={{ color: theme.tint, fontWeight: '700' }}>Finish</Body>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ gap: 10 }}>
          <Muted>Workout name</Muted>
          <Input
            value={activeWorkout.name}
            onChangeText={(name) =>
              void updateActiveWorkout({ ...activeWorkout, name })
            }
            placeholder="Workout name"
          />
          <Muted>
            Duration · {formatDuration(activeWorkout.startedAt)} ·{' '}
            {activeWorkout.exercises.length} exercises
          </Muted>
        </Card>

        <Button
          label="Add exercise"
          onPress={() => router.push('/workout/add-exercise')}
        />

        {activeWorkout.exercises.length === 0 ? (
          <EmptyState
            title="No exercises yet"
            message="Add exercises, then log sets with reps and weight (kg)."
            actionLabel="Add exercise"
            onAction={() => router.push('/workout/add-exercise')}
          />
        ) : (
          activeWorkout.exercises.map((exercise) => (
            <Card key={exercise.id} style={{ gap: 12 }}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Body style={{ fontWeight: '700', fontSize: 17 }}>
                    {exercise.exerciseName}
                  </Body>
                  <Badge label={exercise.muscleGroup} />
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <Pressable
                    onPress={() =>
                      setSwapFor({
                        workoutExerciseId: exercise.id,
                        exerciseId: exercise.exerciseId,
                        name: exercise.exerciseName,
                        muscleGroup: exercise.muscleGroup,
                      })
                    }>
                    <Muted style={{ color: theme.tint, fontWeight: '600' }}>
                      Swap / alternatives
                    </Muted>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        'Remove exercise?',
                        `Remove ${exercise.exerciseName} from this workout?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: () =>
                              void removeExerciseFromActive(exercise.id),
                          },
                        ]
                      );
                    }}>
                    <Muted style={{ color: theme.danger }}>Remove</Muted>
                  </Pressable>
                </View>
              </View>

              <View style={styles.setHeader}>
                <Muted style={styles.colSet}>SET</Muted>
                <Muted style={styles.colNum}>KG</Muted>
                <Muted style={styles.colNum}>REPS</Muted>
                <Muted style={styles.colDone}>DONE</Muted>
              </View>

              {exercise.sets.map((set, index) => (
                <View key={set.id} style={styles.setRow}>
                  <Body style={[styles.colSet, { fontWeight: '700' }]}>
                    {index + 1}
                  </Body>
                  <NumberField
                    value={set.weight}
                    onChange={(weight) =>
                      void updateSet(exercise.id, set.id, { weight })
                    }
                    style={styles.colNum}
                    theme={theme}
                  />
                  <NumberField
                    value={set.reps}
                    onChange={(reps) =>
                      void updateSet(exercise.id, set.id, { reps })
                    }
                    style={styles.colNum}
                    theme={theme}
                  />
                  <Pressable
                    onPress={() =>
                      void updateSet(exercise.id, set.id, {
                        completed: !set.completed,
                      })
                    }
                    onLongPress={() => {
                      if (exercise.sets.length <= 1) return;
                      void removeSet(exercise.id, set.id);
                    }}
                    style={[
                      styles.doneButton,
                      {
                        backgroundColor: set.completed
                          ? theme.success
                          : theme.muted,
                      },
                    ]}>
                    <Body
                      style={{
                        color: set.completed ? '#fff' : theme.textSecondary,
                        fontWeight: '700',
                        fontSize: 14,
                      }}>
                      {set.completed ? '✓' : '○'}
                    </Body>
                  </Pressable>
                </View>
              ))}

              <Button
                label="+ Add set"
                variant="secondary"
                onPress={() => void addSet(exercise.id)}
              />
            </Card>
          ))
        )}

        <View style={{ gap: 10, marginTop: 8 }}>
          <Button label="Finish workout" onPress={onFinish} />
          <Button label="Discard workout" variant="ghost" onPress={onDiscard} />
        </View>
      </ScrollView>

      <AlternativesModal
        visible={!!swapFor}
        title={swapFor?.name ?? ''}
        muscleGroup={swapFor?.muscleGroup ?? ''}
        alternatives={swapFor ? getAlternatives(swapFor.exerciseId) : []}
        theme={theme}
        onClose={() => setSwapFor(null)}
        onPick={async (alt) => {
          if (!swapFor) return;
          await replaceExerciseInActive(swapFor.workoutExerciseId, alt);
          setSwapFor(null);
        }}
      />
    </Screen>
  );
}

function AlternativesModal({
  visible,
  title,
  muscleGroup,
  alternatives,
  theme,
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  muscleGroup: string;
  alternatives: Exercise[];
  theme: ReturnType<typeof useTheme>;
  onClose: () => void;
  onPick: (exercise: Exercise) => void | Promise<void>;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
          <Title style={{ fontSize: 22 }}>Same muscle alternatives</Title>
          <Subtitle>
            Don’t enjoy {title}? Try another exercise that still hits {muscleGroup}.
          </Subtitle>
          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }}>
            {alternatives.length === 0 ? (
              <Muted>No alternatives found in your library for this muscle.</Muted>
            ) : (
              alternatives.map((alt) => (
                <Pressable
                  key={alt.id}
                  onPress={() => void onPick(alt)}
                  style={[
                    styles.altRow,
                    { backgroundColor: theme.muted, borderColor: theme.border },
                  ]}>
                  <Body style={{ fontWeight: '700', flex: 1 }}>{alt.name}</Body>
                  <Muted>Use this</Muted>
                </Pressable>
              ))
            )}
          </ScrollView>
          <Button label="Keep current exercise" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function NumberField({
  value,
  onChange,
  style,
  theme,
}: {
  value: number;
  onChange: (n: number) => void;
  style?: object;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <TextInput
      value={String(value)}
      keyboardType="decimal-pad"
      onChangeText={(text) => {
        const cleaned = text.replace(',', '.').replace(/[^0-9.]/g, '');
        if (cleaned === '' || cleaned === '.') {
          onChange(0);
          return;
        }
        const n = Number(cleaned);
        if (!Number.isNaN(n)) onChange(n);
      }}
      style={[
        {
          backgroundColor: theme.muted,
          color: theme.text,
          borderRadius: 10,
          paddingVertical: 8,
          paddingHorizontal: 8,
          textAlign: 'center',
          fontSize: 16,
          fontWeight: '600',
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 48,
  },
  centered: {
    justifyContent: 'center',
    padding: 20,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colSet: {
    width: 36,
    textAlign: 'center',
  },
  colNum: {
    flex: 1,
  },
  colDone: {
    width: 52,
    textAlign: 'center',
  },
  doneButton: {
    width: 52,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
    paddingBottom: 36,
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
