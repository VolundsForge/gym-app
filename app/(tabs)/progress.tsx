import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import {
  Body,
  EmptyState,
  Muted,
  MuscleTags,
  Screen,
  Subtitle,
  useTheme,
} from '@/components/ui';
import { useSettings } from '@/context/SettingsContext';
import { useWorkouts } from '@/context/WorkoutContext';
import { Radius } from '@/constants/Colors';
import { normalizeEquipment } from '@/lib/exercises';
import { formatGrowth, hasRecentLoadIncrease } from '@/lib/progress';
import { isComposingWorkout, usesWeight } from '@/lib/workout-plan';
import { GrowthProgressBar } from '@/components/growth-progress-bar';
import { progressionComboProgress } from '@/lib/suggestions';
import { formatDate } from '@/lib/stats';
import { formatWeight } from '@/lib/weight';
import { indexById } from '@/lib/id';

export default function ProgressScreen() {
  const theme = useTheme();
  const { weightUnit, progressionNudgesEnabled, progressionSessionThreshold } =
    useSettings();
  const {
    ready,
    progressList,
    activeWorkout,
    progressiveSuggestions,
    exerciseNextPlans,
    exercises,
  } = useWorkouts();
  const catalogById = useMemo(() => indexById(exercises), [exercises]);
  const nudgeIds = useMemo(
    () => new Set(progressiveSuggestions.map((tip) => tip.exerciseId)),
    [progressiveSuggestions]
  );
  const plannedIds = useMemo(
    () => new Set(exerciseNextPlans.map((plan) => plan.exerciseId)),
    [exerciseNextPlans]
  );
  const topGrowth = useMemo(
    () =>
      progressList
        .filter(
          (p) =>
            p.volumeChangePct !== null &&
            p.volumeChangePct > 0 &&
            p.sessions.length >= 2
        )
        .slice(0, 3),
    [progressList]
  );

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
        data={progressList}
        keyExtractor={(item) => item.exerciseId}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 12 }}>
            <Subtitle>
              Every logged set builds a trail. Open an exercise to see progress and
              get alternatives if you want a change.
            </Subtitle>
            {topGrowth.length > 0 ? (
              <View style={{ gap: 8, marginTop: 8 }}>
                <Body style={{ fontWeight: '700', fontSize: 18 }}>Growing strong</Body>
                {topGrowth.map((p) => (
                  <Pressable
                    key={p.exerciseId}
                    onPress={() => router.push(`/exercise/${p.exerciseId}`)}
                    style={({ pressed }) => [
                      styles.growthRow,
                      {
                        backgroundColor: theme.tintMuted,
                        borderColor: theme.tint,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Body style={{ fontWeight: '700' }}>{p.exerciseName}</Body>
                      <Muted>
                        {usesWeight(
                          catalogById.get(p.exerciseId)?.equipment,
                          p.muscleGroup
                        )
                          ? `${formatWeight(p.firstBestWeight, weightUnit)} → ${formatWeight(p.lastBestWeight, weightUnit)} · `
                          : ''}
                        {p.sessions.length} sessions
                      </Muted>
                    </View>
                    <Body style={{ fontWeight: '800', color: theme.success }}>
                      {formatGrowth(p.volumeChangePct)}
                    </Body>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No progress yet"
            message="Log the same exercise a few times — your growth will show up here and keep you motivated."
            actionLabel={
              activeWorkout
                ? isComposingWorkout(activeWorkout)
                  ? 'Continue creating'
                  : 'Continue workout'
                : 'Go to Home'
            }
            onAction={() => {
              if (activeWorkout) router.push('/workout/active');
              else router.replace('/');
            }}
          />
        }
        renderItem={({ item }) => {
          const growth = formatGrowth(item.volumeChangePct);
          const positive =
            item.volumeChangePct !== null && item.volumeChangePct > 0;
          const negative =
            item.volumeChangePct !== null && item.volumeChangePct < 0;
          const highlight =
            nudgeIds.has(item.exerciseId) ||
            plannedIds.has(item.exerciseId) ||
            hasRecentLoadIncrease(item);
          const combo = progressionNudgesEnabled
            ? progressionComboProgress(item, progressionSessionThreshold)
            : null;
          const catalog = catalogById.get(item.exerciseId);

          return (
            <Pressable
              onPress={() => router.push(`/exercise/${item.exerciseId}`)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: highlight ? theme.tint : theme.border,
                  borderWidth: highlight ? 2 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}>
              <View style={styles.titleRow}>
                <View style={styles.titlePills}>
                  <Body style={styles.exerciseName}>
                    {item.exerciseName}
                  </Body>
                  <MuscleTags
                    primary={item.muscleGroup}
                    secondary={item.secondaryMuscleGroups}
                    equipment={normalizeEquipment(catalog?.equipment)}
                    layout="pills"
                  />
                </View>
                <Body
                  style={{
                    fontWeight: '800',
                    flexShrink: 0,
                    color: positive
                      ? theme.success
                      : negative
                        ? theme.danger
                        : theme.textSecondary,
                  }}>
                  {growth}
                </Body>
              </View>
              <Muted style={{ marginTop: 10 }}>
                {usesWeight(catalog?.equipment, item.muscleGroup)
                  ? `Best load: ${formatWeight(item.firstBestWeight, weightUnit)} → ${formatWeight(item.lastBestWeight, weightUnit)} · `
                  : ''}
                Best reps: {item.firstBestReps} → {item.lastBestReps}
              </Muted>
              {combo ? (
                <View style={{ marginTop: 12 }}>
                  <GrowthProgressBar
                    ratio={combo.ratio}
                    seed={item.exerciseId}
                    ready={combo.ready}
                    current={combo.current}
                    goal={combo.goal}
                  />
                </View>
              ) : null}
              <View style={styles.cardFooter}>
                <Muted>{item.sessions.length} sessions total</Muted>
                {item.lastSessionAt ? (
                  <Muted>Last {formatDate(item.lastSessionAt)}</Muted>
                ) : null}
              </View>
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
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titlePills: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  exerciseName: {
    fontWeight: '700',
    fontSize: 17,
    marginRight: 10,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
