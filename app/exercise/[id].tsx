import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { HeaderNotes } from '@/components/expandable-notes';
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
  useTheme,
} from '@/components/ui';
import { getSecondaryMuscleGroups, normalizeEquipment } from '@/lib/exercises';
import { useSettings } from '@/context/SettingsContext';
import { useWorkouts } from '@/context/WorkoutContext';
import { formatGrowth } from '@/lib/progress';
import { progressionProgressLabel } from '@/lib/suggestions';
import { formatClockSeconds, formatDate } from '@/lib/stats';
import { isTimedExercise, usesWeight } from '@/lib/workout-plan';
import { formatWeight } from '@/lib/weight';

export default function ExerciseDetailScreen() {
  const theme = useTheme();
  const { weightUnit, progressionNudgesEnabled, progressionSessionThreshold } =
    useSettings();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    exercises,
    getProgressFor,
    progressiveSuggestions,
    startWorkout,
    activeWorkout,
    beginPendingExercise,
    setExerciseNotes,
    workouts,
  } = useWorkouts();

  const exercise = useMemo(
    () => exercises.find((e) => e.id === id),
    [exercises, id]
  );
  const progress = id ? getProgressFor(id) : undefined;
  const tip = progressiveSuggestions.find((s) => s.exerciseId === id);

  if (!exercise) {
    return (
      <Screen style={styles.centered}>
        <Stack.Screen options={exerciseHeaderOptions('Exercise')} />
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
    await beginPendingExercise(exercise);
    router.push('/workout/active');
  };

  const cardio = isTimedExercise(exercise);
  const sessions = [...(progress?.sessions ?? [])].reverse();
  const cardioSessions = cardio
    ? workouts
        .filter((w) => w.finishedAt)
        .flatMap((w) =>
          w.exercises
            .filter((ex) => ex.exerciseId === exercise.id)
            .map((ex) => ({
              workoutId: w.id,
              date: w.finishedAt ?? w.startedAt,
              durationSeconds: ex.durationSeconds ?? 0,
              notes: ex.notes,
            }))
        )
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
    : [];

  return (
    <Screen>
      <Stack.Screen options={exerciseHeaderOptions(exercise.name)} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ gap: 10 }}>
          <MuscleTags
            primary={exercise.muscleGroup}
            secondary={getSecondaryMuscleGroups(exercise)}
            equipment={normalizeEquipment(exercise.equipment)}
            layout="stacked"
          />
          <HeaderNotes
            value={exercise.notes ?? ''}
            onChange={(text) => void setExerciseNotes(exercise.id, text)}
            title={
              <Body style={{ fontWeight: '700', fontSize: 17 }}>Notes</Body>
            }
          />
          <Subtitle>
            {cardio
              ? 'Time this during a workout. Notes stay with this exercise across sessions.'
              : 'Log sets over time to see growth. Notes stay with this exercise.'}
          </Subtitle>
        </View>

        {cardio ? null : (
        <View style={styles.statsRow}>
          <MiniStat
            label="Sessions"
            value={String(progress?.sessions.length ?? 0)}
            theme={theme}
          />
          <MiniStat
            label="Growth"
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
        )}

        {cardio || !progressionNudgesEnabled ? null : tip ? (
          <Card
            style={{
              gap: 10,
              borderColor: theme.tint,
              borderWidth: 1,
              backgroundColor: theme.tintMuted,
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
            <Muted>
              {progressionProgressLabel(progress, progressionSessionThreshold)}
            </Muted>
            <Subtitle>
              After {progressionSessionThreshold} sessions at the same sets, reps,
              and weight, you’ll get a gentle suggestion to add a little more.
            </Subtitle>
          </Card>
        ) : null}

        <Button label="Add to workout" onPress={() => void onTrain()} />

        <View style={styles.historySection}>
          <Body style={{ fontWeight: '700', fontSize: 18, textAlign: 'center' }}>
            Session history
          </Body>
          {cardio ? (
            cardioSessions.length === 0 ? (
              <Muted style={{ textAlign: 'center' }}>No sessions yet</Muted>
            ) : (
              cardioSessions.map((s) => (
                <Pressable
                  key={`${s.workoutId}-${s.date}`}
                  onPress={() => router.push(`/workout/${s.workoutId}`)}
                  style={[
                    styles.sessionRow,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}>
                  <View style={styles.rowBetween}>
                    <Body style={{ fontWeight: '700' }}>{formatDate(s.date)}</Body>
                    <Muted>{formatClockSeconds(s.durationSeconds)}</Muted>
                  </View>
                  {s.notes ? (
                    <Muted numberOfLines={2} style={{ marginTop: 6 }}>
                      {s.notes}
                    </Muted>
                  ) : null}
                </Pressable>
              ))
            )
          ) : sessions.length === 0 ? (
            <Muted style={{ textAlign: 'center' }}>No sessions yet</Muted>
          ) : (
            sessions.map((s, index) => {
              const prev = sessions[index + 1];
              const showLoad = usesWeight(exercise.equipment, exercise.muscleGroup);
              const improved =
                !!prev &&
                (s.totalSets > prev.totalSets ||
                  s.bestReps > prev.bestReps ||
                  (showLoad && s.bestWeight > prev.bestWeight + 0.05));
              const stats = showLoad
                ? `${s.totalSets} sets · ${s.bestReps} reps · ${formatWeight(s.bestWeight, weightUnit)}`
                : `${s.totalSets} sets · ${s.bestReps} reps`;
              return (
                <Pressable
                  key={`${s.workoutId}-${s.date}`}
                  onPress={() => router.push(`/workout/${s.workoutId}`)}
                  style={[
                    styles.sessionRow,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}>
                  <View style={styles.rowBetween}>
                    <Body style={{ fontWeight: '700' }} numberOfLines={1}>
                      {formatDate(s.date)}
                    </Body>
                    <Muted style={{ flex: 1 }} numberOfLines={1}>
                      {stats}
                    </Muted>
                    <View style={styles.improveSlot}>
                      {improved ? (
                        <View
                          style={[
                            styles.improveGlow,
                            {
                              backgroundColor: 'rgba(63, 125, 78, 0.2)',
                              boxShadow: '0 0 10px rgba(63, 125, 78, 0.75)',
                            },
                          ]}>
                          <Ionicons
                            name="arrow-up"
                            size={16}
                            color={theme.success}
                            accessibilityLabel="Improved from last session"
                          />
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function ExercisesHeaderBack() {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to Exercises"
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/exercises');
      }}
      hitSlop={8}
      style={styles.headerBack}>
      <Ionicons name="chevron-back" size={28} color={theme.text} />
      <Body
        numberOfLines={1}
        style={{
          fontWeight: '600',
          fontSize: 17,
          letterSpacing: -0.3,
          color: theme.text,
        }}>
        Exercises
      </Body>
    </Pressable>
  );
}

function exerciseHeaderOptions(title: string) {
  return {
    title,
    headerTitleAlign: 'center' as const,
    headerBackVisible: false,
    headerBackTitle: 'Exercises',
    headerLeft: () => <ExercisesHeaderBack />,
  };
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
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.border,
      }}>
      <Muted>{label}</Muted>
      <Body style={{ fontWeight: '800', fontSize: 18, color: highlight ?? theme.text }}>
        {value}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Platform.OS === 'ios' ? -8 : 0,
    paddingRight: 4,
    maxWidth: 148,
  },
  content: {
    paddingVertical: 20,
    gap: 28,
    paddingBottom: 56,
  },
  historySection: {
    gap: 12,
    marginTop: 20,
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
  sessionRow: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  improveSlot: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  improveGlow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
