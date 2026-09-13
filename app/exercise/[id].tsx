import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  Body,
  Button,
  Card,
  EmptyState,
  Muted,
  MuscleTags,
  Screen,
  Subtitle,
  Title,
  useTheme,
} from '@/components/ui';
import { getSecondaryMuscleGroups, normalizeEquipment } from '@/lib/exercises';
import { useWorkouts } from '@/context/WorkoutContext';
import { formatGrowth } from '@/lib/progress';
import { progressionProgressLabel } from '@/lib/suggestions';
import { formatDate } from '@/lib/stats';

export default function ExerciseDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    exercises,
    getProgressFor,
    getAlternatives,
    progressiveSuggestions,
    startWorkout,
    activeWorkout,
    addExerciseToActive,
  } = useWorkouts();

  const [showAlts, setShowAlts] = useState(false);

  const exercise = useMemo(
    () => exercises.find((e) => e.id === id),
    [exercises, id]
  );
  const progress = id ? getProgressFor(id) : undefined;
  const alternatives = id ? getAlternatives(id) : [];
  const tip = progressiveSuggestions.find((s) => s.exerciseId === id);

  if (!exercise) {
    return (
      <Screen style={styles.centered}>
        <EmptyState
          title="Exercise not found"
          message="It may have been removed from your library."
          actionLabel="Back to exercises"
          onAction={() => router.replace('/exercises')}
        />
      </Screen>
    );
  }

  const onTrain = async () => {
    if (!activeWorkout) startWorkout();
    await addExerciseToActive(exercise);
    router.push('/workout/active');
  };

  const sessions = [...(progress?.sessions ?? [])].reverse();

  return (
    <Screen>
      <Stack.Screen options={{ title: exercise.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ gap: 10 }}>
          <Title style={{ fontSize: 26 }}>{exercise.name}</Title>
          <MuscleTags
            primary={exercise.muscleGroup}
            secondary={getSecondaryMuscleGroups(exercise)}
            layout="stacked"
          />
          <View style={{ gap: 4 }}>
            <Muted>Equipment</Muted>
            <Badge label={normalizeEquipment(exercise.equipment)} />
          </View>
          <Subtitle>
            Log sets over time to see growth. If this machine isn’t for you, grab an
            alternative that hits the same primary muscle.
          </Subtitle>
        </View>

        <View style={styles.statsRow}>
          <MiniStat
            label="Sessions"
            value={String(progress?.sessions.length ?? 0)}
            theme={theme}
          />
          <MiniStat
            label="Volume growth"
            value={formatGrowth(progress?.volumeChangePct ?? null)}
            theme={theme}
            highlight={
              progress?.volumeChangePct != null && progress.volumeChangePct > 0
                ? theme.success
                : undefined
            }
          />
          <MiniStat
            label="Last 3 mo"
            value={String(progress?.sessionsInLast3Months ?? 0)}
            theme={theme}
          />
        </View>

        {tip ? (
          <Card
            style={{
              gap: 10,
              borderColor: theme.tint,
              borderWidth: 1,
              backgroundColor: theme.muted,
            }}>
            <Badge label="Growth tip" />
            <Body style={{ fontWeight: '700', fontSize: 17 }}>{tip.title}</Body>
            <Subtitle>{tip.message}</Subtitle>
            <View style={styles.rowBetween}>
              <Muted>Now: {tip.currentLabel}</Muted>
              <Body style={{ fontWeight: '700', color: theme.tint }}>
                Aim: {tip.targetLabel}
              </Body>
            </View>
          </Card>
        ) : progress ? (
          <Card style={{ gap: 6 }}>
            <Body style={{ fontWeight: '700' }}>Progress path</Body>
            <Muted>{progressionProgressLabel(progress)}</Muted>
            <Subtitle>
              After about 10 sessions of this exercise within 3 months, you’ll get a
              gentle suggestion to add a little more (reps, sets, or weight).
            </Subtitle>
          </Card>
        ) : null}

        <Button label="Add to workout" onPress={() => void onTrain()} />

        <Card style={{ gap: 10 }}>
          <View style={styles.rowBetween}>
            <Body style={{ fontWeight: '700', fontSize: 17 }}>
              Don’t like this one?
            </Body>
            <Button
              label={showAlts ? 'Hide' : 'Suggest others'}
              variant="ghost"
              onPress={() => setShowAlts((v) => !v)}
              style={{ paddingVertical: 6, paddingHorizontal: 8 }}
            />
          </View>
          <Subtitle>
            Alternatives that hit the same primary muscle ({exercise.muscleGroup}).
          </Subtitle>
          {showAlts ? (
            alternatives.length === 0 ? (
              <Muted>No alternatives in your library yet — add a custom exercise.</Muted>
            ) : (
              alternatives.map((alt) => (
                <Pressable
                  key={alt.id}
                  onPress={() => router.push(`/exercise/${alt.id}`)}
                  style={[
                    styles.altRow,
                    { backgroundColor: theme.muted, borderColor: theme.border },
                  ]}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Body style={{ fontWeight: '600' }}>{alt.name}</Body>
                    <Muted>
                      {alt.muscleGroup} · {normalizeEquipment(alt.equipment)}
                    </Muted>
                  </View>
                </Pressable>
              ))
            )
          ) : null}
        </Card>

        <Body style={{ fontWeight: '700', fontSize: 18, marginTop: 4 }}>
          Session history
        </Body>
        {sessions.length === 0 ? (
          <EmptyState
            title="Nothing logged yet"
            message="When you complete sets on this exercise, each session appears here so you can see growth."
            actionLabel="Log a session"
            onAction={() => void onTrain()}
          />
        ) : (
          sessions.map((s) => (
            <Pressable
              key={`${s.workoutId}-${s.date}`}
              onPress={() => router.push(`/workout/${s.workoutId}`)}
              style={[
                styles.sessionRow,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}>
              <View style={styles.rowBetween}>
                <Body style={{ fontWeight: '700' }}>{formatDate(s.date)}</Body>
                <Muted>{s.totalSets} sets</Muted>
              </View>
              <Muted style={{ marginTop: 6 }}>
                Best {s.bestWeight} kg × {s.bestReps} reps · Volume{' '}
                {Math.round(s.volume)} kg
              </Muted>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function MiniStat({
  label,
  value,
  theme,
  highlight,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
  highlight?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.muted,
        borderRadius: 14,
        padding: 12,
        gap: 4,
      }}>
      <Muted>{label}</Muted>
      <Body style={{ fontWeight: '800', fontSize: 18, color: highlight ?? theme.text }}>
        {value}
      </Body>
    </View>
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
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sessionRow: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
});
