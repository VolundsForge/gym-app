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
import { useWorkouts } from '@/context/WorkoutContext';
import {
  EQUIPMENT_TYPES,
  MUSCLE_GROUPS,
  exerciseListRows,
  normalizeEquipment,
} from '@/lib/exercises';
import type { Equipment, Exercise, MuscleGroup } from '@/types/workout';

export default function AddExerciseScreen() {
  const theme = useTheme();
  const { exercises, activeWorkout, addExerciseToActive, addCustomExercise } =
    useWorkouts();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleGroup>('Chest');
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | 'All'>('All');

  const alreadyAdded = useMemo(
    () => new Set(activeWorkout?.exercises.map((e) => e.exerciseId) ?? []),
    [activeWorkout]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((ex) => {
      const matchesQuery = !q || ex.name.toLowerCase().includes(q);
      const matchesGroup = ex.muscleGroup === filter;
      const matchesEquipment =
        equipmentFilter === 'All' ||
        normalizeEquipment(ex.equipment) === equipmentFilter;
      return matchesQuery && matchesGroup && matchesEquipment;
    });
  }, [exercises, query, filter, equipmentFilter]);

  const rows = useMemo(
    () => exerciseListRows(filtered, equipmentFilter === 'All'),
    [filtered, equipmentFilter]
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
    await addExerciseToActive(exercise);
    router.back();
  };

  const onCreateAndAdd = async () => {
    const name = query.trim();
    if (!name) {
      Alert.alert('Enter a name', 'Type an exercise name above, then create it.');
      return;
    }
    const equipment =
      equipmentFilter === 'All' ? 'Barbell / Dumbbell' : equipmentFilter;
    const exercise = await addCustomExercise(name, filter, undefined, equipment);
    await addExerciseToActive(exercise);
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
              Pick from the library. Filter to Bodyweight if you don’t have machines.
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
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
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
