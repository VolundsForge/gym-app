import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import {
  Body,
  EmptyState,
  Input,
  Muted,
  Screen,
  Subtitle,
  Title,
  useTheme,
} from '@/components/ui';
import { useWorkouts } from '@/context/WorkoutContext';
import { formatDate, formatDuration, workoutVolume } from '@/lib/stats';

export default function HistoryScreen() {
  const theme = useTheme();
  const { ready, workouts, deleteWorkout, startWorkout, activeWorkout } = useWorkouts();
  const [query, setQuery] = useState('');

  const finished = useMemo(() => {
    const list = workouts.filter((w) => w.finishedAt);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.exercises.some((e) => e.exerciseName.toLowerCase().includes(q))
    );
  }, [workouts, query]);

  if (!ready) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={theme.tint} size="large" />
      </Screen>
    );
  }

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Delete workout?', `"${name}" will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void deleteWorkout(id),
      },
    ]);
  };

  return (
    <Screen>
      <FlatList
        data={finished}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <Title>History</Title>
            <Subtitle>Browse past sessions and search by workout or exercise name.</Subtitle>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search workouts..."
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={query ? 'No matches' : 'No history yet'}
            message={
              query
                ? 'Try a different search term.'
                : 'Finish a workout and it will appear in your history.'
            }
            actionLabel={query ? undefined : activeWorkout ? 'Continue workout' : 'Start workout'}
            onAction={
              query
                ? undefined
                : () => {
                    if (!activeWorkout) startWorkout();
                    router.push('/workout/active');
                  }
            }
          />
        }
        renderItem={({ item }) => {
          const sets = item.exercises.reduce(
            (n, ex) => n + ex.sets.filter((s) => s.completed).length,
            0
          );
          return (
            <Pressable
              onPress={() => router.push(`/workout/${item.id}`)}
              onLongPress={() => confirmDelete(item.id, item.name)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <View style={styles.rowBetween}>
                <Body style={{ fontWeight: '700', flex: 1 }}>{item.name}</Body>
                <Muted>{formatDate(item.finishedAt ?? item.startedAt)}</Muted>
              </View>
              <Muted style={{ marginTop: 6 }}>
                {item.exercises.length} exercises · {sets} sets ·{' '}
                {formatDuration(item.startedAt, item.finishedAt)} ·{' '}
                {Math.round(workoutVolume(item))} kg
              </Muted>
              <Muted style={{ marginTop: 8 }}>
                {item.exercises
                  .slice(0, 4)
                  .map((e) => e.exerciseName)
                  .join(' · ')}
                {item.exercises.length > 4 ? '…' : ''}
              </Muted>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
