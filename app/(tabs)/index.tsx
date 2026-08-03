import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  Body,
  Button,
  Card,
  EmptyState,
  Muted,
  Screen,
  StatPill,
  Subtitle,
  Title,
  useTheme,
} from '@/components/ui';
import { useWorkouts } from '@/context/WorkoutContext';
import { formatGrowth } from '@/lib/progress';
import { formatDate, formatDuration, workoutVolume } from '@/lib/stats';

export default function HomeScreen() {
  const theme = useTheme();
  const {
    ready,
    stats,
    workouts,
    activeWorkout,
    startWorkout,
    progressiveSuggestions,
    progressList,
    dismissSuggestion,
  } = useWorkouts();

  if (!ready) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={theme.tint} size="large" />
      </Screen>
    );
  }

  const recent = workouts.filter((w) => w.finishedAt).slice(0, 4);
  const topGrowth = progressList
    .filter((p) => p.volumeChangePct !== null && p.sessions.length >= 2)
    .slice(0, 3);
  const tip = progressiveSuggestions[0];

  const onStart = () => {
    if (activeWorkout) {
      router.push('/workout/active');
      return;
    }
    startWorkout();
    router.push('/workout/active');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Title>Gym Tracker</Title>
          <Subtitle>
            Log sets and reps. Watch your growth. Get a nudge when you’re ready for a
            little more.
          </Subtitle>
        </View>

        <View style={styles.statsRow}>
          <StatPill label="This week" value={stats.workoutsThisWeek} />
          <StatPill label="Total" value={stats.totalWorkouts} />
          <StatPill label="Sets" value={stats.totalSets} />
        </View>

        {tip ? (
          <Card
            style={{
              gap: 10,
              borderColor: theme.tint,
              borderWidth: 1,
            }}>
            <Badge label="Strive for more" />
            <Body style={{ fontWeight: '700', fontSize: 18 }}>{tip.title}</Body>
            <Subtitle>{tip.message}</Subtitle>
            <View style={styles.rowBetween}>
              <Muted>Recent: {tip.currentLabel}</Muted>
              <Body style={{ fontWeight: '700', color: theme.tint }}>
                Try: {tip.targetLabel}
              </Body>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label="View exercise"
                variant="secondary"
                onPress={() => router.push(`/exercise/${tip.exerciseId}`)}
                style={{ flex: 1 }}
              />
              <Button
                label="Dismiss"
                variant="ghost"
                onPress={() => void dismissSuggestion(tip.id)}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        ) : null}

        {activeWorkout ? (
          <Card style={{ gap: 12, borderColor: theme.tint, borderWidth: 1 }}>
            <Badge label="In progress" />
            <Body style={{ fontWeight: '700', fontSize: 18 }}>{activeWorkout.name}</Body>
            <Muted>
              Started {formatDate(activeWorkout.startedAt)} ·{' '}
              {activeWorkout.exercises.length} exercise
              {activeWorkout.exercises.length === 1 ? '' : 's'}
            </Muted>
            <Button label="Continue workout" onPress={() => router.push('/workout/active')} />
          </Card>
        ) : (
          <Card style={{ gap: 12 }}>
            <Body style={{ fontWeight: '700', fontSize: 18 }}>Ready to train?</Body>
            <Subtitle>
              Create your session, log sets and reps, and save progress that motivates
              you over time.
            </Subtitle>
            <Button label="Start workout" onPress={onStart} />
          </Card>
        )}

        {topGrowth.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Body style={{ fontWeight: '700', fontSize: 18 }}>Growing strong</Body>
              <Button
                label="All progress"
                variant="ghost"
                onPress={() => router.push('/progress')}
                style={{ paddingVertical: 6, paddingHorizontal: 8 }}
              />
            </View>
            {topGrowth.map((p) => (
              <Card key={p.exerciseId} style={{ gap: 6, marginBottom: 4 }}>
                <View style={styles.rowBetween}>
                  <Body style={{ fontWeight: '700', flex: 1 }}>{p.exerciseName}</Body>
                  <Body style={{ fontWeight: '800', color: theme.success }}>
                    {formatGrowth(p.volumeChangePct)}
                  </Body>
                </View>
                <Muted>
                  {p.firstBestWeight} → {p.lastBestWeight} kg · {p.sessions.length}{' '}
                  sessions
                </Muted>
                <Button
                  label="See details"
                  variant="secondary"
                  onPress={() => router.push(`/exercise/${p.exerciseId}`)}
                  style={{ marginTop: 6 }}
                />
              </Card>
            ))}
          </>
        ) : null}

        <View style={styles.sectionHeader}>
          <Body style={{ fontWeight: '700', fontSize: 18 }}>Recent workouts</Body>
          {recent.length > 0 ? (
            <Button
              label="See all"
              variant="ghost"
              onPress={() => router.push('/history')}
              style={{ paddingVertical: 6, paddingHorizontal: 8 }}
            />
          ) : null}
        </View>

        {recent.length === 0 ? (
          <EmptyState
            title="No workouts yet"
            message="Finish a session and your history becomes the fuel for growth charts and smart tips."
            actionLabel={activeWorkout ? 'Continue workout' : 'Start first workout'}
            onAction={onStart}
          />
        ) : (
          recent.map((workout) => {
            const sets = workout.exercises.reduce(
              (n, ex) => n + ex.sets.filter((s) => s.completed).length,
              0
            );
            return (
              <Card key={workout.id} style={{ gap: 6, marginBottom: 10 }}>
                <View style={styles.rowBetween}>
                  <Body style={{ fontWeight: '700', flex: 1 }}>{workout.name}</Body>
                  <Muted>{formatDate(workout.finishedAt ?? workout.startedAt)}</Muted>
                </View>
                <Muted>
                  {workout.exercises.length} exercises · {sets} sets ·{' '}
                  {formatDuration(workout.startedAt, workout.finishedAt)} ·{' '}
                  {Math.round(workoutVolume(workout))} kg volume
                </Muted>
                <Button
                  label="View details"
                  variant="secondary"
                  onPress={() => router.push(`/workout/${workout.id}`)}
                  style={{ marginTop: 8 }}
                />
              </Card>
            );
          })
        )}
      </ScrollView>
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
  statsRow: {
    flexDirection: 'row',
    gap: 10,
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
