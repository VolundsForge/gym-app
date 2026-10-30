import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  useTheme,
} from '@/components/ui';
import { useWorkouts } from '@/context/WorkoutContext';
import { Radius } from '@/constants/Colors';
import {
  calendarDayKey,
  calendarMonthKey,
  formatDayHeading,
  formatMonthHeading,
  formatTime,
} from '@/lib/stats';
import {
  formatWorkoutListMeta,
  isComposingWorkout,
  isLoggedWorkout,
} from '@/lib/workout-plan';
import type { Workout } from '@/types/workout';

type HistoryRow =
  | { type: 'month'; key: string; label: string }
  | { type: 'day'; key: string; label: string }
  | { type: 'workout'; key: string; workout: Workout };

function historyRows(workouts: Workout[]): HistoryRow[] {
  const sorted = [...workouts].sort(
    (a, b) =>
      new Date(b.finishedAt ?? b.startedAt).getTime() -
      new Date(a.finishedAt ?? a.startedAt).getTime()
  );

  const rows: HistoryRow[] = [];
  let lastMonth = '';
  let lastDay = '';

  for (const workout of sorted) {
    const iso = workout.finishedAt ?? workout.startedAt;
    const month = calendarMonthKey(iso);
    const day = calendarDayKey(iso);

    if (month !== lastMonth) {
      rows.push({
        type: 'month',
        key: `month-${month}`,
        label: formatMonthHeading(iso),
      });
      lastMonth = month;
    }
    if (day !== lastDay) {
      rows.push({
        type: 'day',
        key: `day-${day}`,
        label: formatDayHeading(iso),
      });
      lastDay = day;
    }
    rows.push({ type: 'workout', key: workout.id, workout });
  }

  return rows;
}

export default function HistoryScreen() {
  const theme = useTheme();
  const { ready, workouts, activeWorkout } = useWorkouts();
  const [query, setQuery] = useState('');

  const finished = useMemo(() => {
    const list = workouts.filter(isLoggedWorkout);
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

  return (
    <Screen>
      <FlatList
        data={historyRows(finished)}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <Subtitle>
              Sessions grouped by your calendar — today, yesterday, then each date.
            </Subtitle>
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
            actionLabel={
              query
                ? undefined
                : activeWorkout
                  ? isComposingWorkout(activeWorkout)
                    ? 'Continue creating'
                    : 'Continue workout'
                  : 'Go to Home'
            }
            onAction={
              query
                ? undefined
                : () => {
                    if (activeWorkout) router.push('/workout/active');
                    else router.replace('/');
                  }
            }
          />
        }
        renderItem={({ item }) => {
          if (item.type === 'month') {
            return (
              <Body style={[styles.monthHeading, { color: theme.text }]}>
                {item.label}
              </Body>
            );
          }
          if (item.type === 'day') {
            return (
              <Muted style={styles.dayHeading}>{item.label}</Muted>
            );
          }

          const workout = item.workout;
          return (
            <Pressable
              onPress={() => router.push(`/workout/${workout.id}`)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <View style={styles.rowBetween}>
                <Body style={{ fontWeight: '700', flex: 1 }}>{workout.name}</Body>
                <Muted>{formatTime(workout.finishedAt ?? workout.startedAt)}</Muted>
              </View>
              <Muted style={{ marginTop: 6 }}>
                {formatWorkoutListMeta(workout)}
              </Muted>
              <Muted style={{ marginTop: 8 }}>
                {workout.exercises
                  .slice(0, 4)
                  .map((e) => e.exerciseName)
                  .join(' · ')}
                {workout.exercises.length > 4 ? '…' : ''}
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
    paddingVertical: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  monthHeading: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    marginTop: 18,
    marginBottom: 4,
  },
  dayHeading: {
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 6,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
