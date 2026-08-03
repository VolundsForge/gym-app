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
  Input,
  Muted,
  Screen,
  Subtitle,
  useTheme,
} from '@/components/ui';
import { useWorkouts } from '@/context/WorkoutContext';
import { MUSCLE_GROUPS } from '@/lib/exercises';
import type { Exercise, MuscleGroup } from '@/types/workout';

export default function AddExerciseScreen() {
  const theme = useTheme();
  const { exercises, activeWorkout, addExerciseToActive, addCustomExercise } =
    useWorkouts();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleGroup | 'All'>('All');

  const alreadyAdded = useMemo(
    () => new Set(activeWorkout?.exercises.map((e) => e.exerciseId) ?? []),
    [activeWorkout]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((ex) => {
      const matchesQuery = !q || ex.name.toLowerCase().includes(q);
      const matchesGroup = filter === 'All' || ex.muscleGroup === filter;
      return matchesQuery && matchesGroup;
    });
  }, [exercises, query, filter]);

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
    const group = filter === 'All' ? 'Full Body' : filter;
    const exercise = await addCustomExercise(name, group);
    await addExerciseToActive(exercise);
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Add Exercise' }} />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <Subtitle>Pick from the library or create a custom exercise.</Subtitle>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search or create..."
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            <FlatList
              horizontal
              data={['All', ...MUSCLE_GROUPS] as const}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => {
                const selected = filter === item;
                return (
                  <Pressable
                    onPress={() => setFilter(item)}
                    style={{
                      backgroundColor: selected ? theme.tint : theme.muted,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                    }}>
                    <Body
                      style={{
                        color: selected ? '#fff' : theme.text,
                        fontSize: 13,
                        fontWeight: '600',
                      }}>
                      {item}
                    </Body>
                  </Pressable>
                );
              }}
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
          const added = alreadyAdded.has(item.id);
          return (
            <Pressable
              onPress={() => void onSelect(item)}
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
                <Body style={{ fontWeight: '700', flex: 1 }}>{item.name}</Body>
                {added ? <Badge label="Added" /> : <Badge label={item.muscleGroup} />}
              </View>
              {!added ? <Muted style={{ marginTop: 6 }}>{item.muscleGroup}</Muted> : null}
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
