import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import {
  Badge,
  Body,
  Button,
  FilterChips,
  Input,
  Muted,
  Screen,
  Subtitle,
  useTheme,
} from '@/components/ui';
import { Radius } from '@/constants/Colors';
import { useWorkouts } from '@/context/WorkoutContext';
import {
  EQUIPMENT_TYPES,
  MUSCLE_GROUPS,
  exerciseListRows,
  filterExerciseCatalog,
  normalizeEquipment,
  unusedEquipmentForMuscle,
} from '@/lib/exercises';
import type { Equipment, Exercise, MuscleGroup } from '@/types/workout';

export default function AddExerciseScreen() {
  const theme = useTheme();
  const { exercises, activeWorkout, beginPendingExercise, addCustomExercise } =
    useWorkouts();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleGroup>('Chest');
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | 'All'>('All');

  const alreadyAdded = useMemo(() => {
    const ids = activeWorkout?.exercises.map((e) => e.exerciseId) ?? [];
    const pendingId = activeWorkout?.pendingExercise?.exerciseId;
    return new Set(pendingId ? [...ids, pendingId] : ids);
  }, [activeWorkout]);

  const filtered = useMemo(
    () => filterExerciseCatalog(exercises, query, filter, equipmentFilter),
    [exercises, query, filter, equipmentFilter]
  );

  const rows = useMemo(
    () => exerciseListRows(filtered, equipmentFilter === 'All'),
    [filtered, equipmentFilter]
  );
  const unusedEquipment = useMemo(
    () => unusedEquipmentForMuscle(exercises, filter),
    [exercises, filter]
  );

  if (!activeWorkout) {
    return (
      <Screen style={styles.centered}>
        <Subtitle>No active workout. Start one from Home first.</Subtitle>
        <Button label="Go home" onPress={() => router.replace('/')} style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  const onSelect = async (exercise: Exercise) => {
    if (alreadyAdded.has(exercise.id)) {
      Alert.alert('Already added', `${exercise.name} is already in this workout.`);
      return;
    }
    await beginPendingExercise(exercise);
    router.back();
  };

  const onCreateAndAdd = async () => {
    const name = query.trim();
    if (!name) {
      Alert.alert('Enter a name', 'Type an exercise name above, then create it.');
      return;
    }
    const equipment =
      equipmentFilter === 'All'
        ? filter === 'Cardio'
          ? 'Machine'
          : 'Barbell / Dumbbell'
        : equipmentFilter;
    const exercise = await addCustomExercise(name, filter, undefined, equipment);
    await beginPendingExercise(exercise);
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Add Exercise' }} />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <Subtitle>
              Pick one exercise. Next you’ll log sets, reps, and weight, or time
              cardio on the machine.
            </Subtitle>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search or create..."
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            <Muted>Muscle</Muted>
            <FilterChips
              options={MUSCLE_GROUPS}
              value={filter}
              onChange={setFilter}
            />
            <Muted>Equipment</Muted>
            <FilterChips
              options={['All', ...EQUIPMENT_TYPES] as const}
              value={equipmentFilter}
              onChange={setEquipmentFilter}
              inactiveOptions={unusedEquipment}
            />
            {query.trim() ? (
              <Button
                label={`Create & add "${query.trim()}"`}
                variant="secondary"
                onPress={() => void onCreateAndAdd()}
              />
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <Muted style={{ marginTop: 8, marginBottom: 6, fontWeight: '700' }}>
                {item.title}
              </Muted>
            );
          }

          const exercise = item.exercise;
          const added = alreadyAdded.has(exercise.id);
          return (
            <Pressable
              onPress={() => void onSelect(exercise)}
              disabled={added}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: added ? 0.45 : pressed ? 0.85 : 1,
                },
              ]}>
              <View style={styles.rowBetween}>
                <Body style={{ fontWeight: '700', flex: 1 }}>{exercise.name}</Body>
                {added ? <Badge label="Added" /> : null}
              </View>
              {!added ? (
                <Muted style={{ marginTop: 6 }}>
                  {exercise.muscleGroup} · {normalizeEquipment(exercise.equipment)}
                </Muted>
              ) : null}
              {!added && exercise.notes ? (
                <Muted numberOfLines={2} style={{ marginTop: 4 }}>
                  {exercise.notes}
                </Muted>
              ) : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Muted style={{ textAlign: 'center', marginTop: 24 }}>
            No matches. Create a custom exercise above.
          </Muted>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  centered: {
    justifyContent: 'center',
    padding: 20,
  },
});
