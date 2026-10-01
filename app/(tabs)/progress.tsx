import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import {
  Body,
  EmptyState,
  Muted,
  MuscleTags,
  Screen,
  Subtitle,
  Title,
  useTheme,
} from '@/components/ui';
import { useWorkouts } from '@/context/WorkoutContext';
import { Radius } from '@/constants/Colors';
import { formatGrowth } from '@/lib/progress';
import { progressionProgressLabel } from '@/lib/suggestions';
import { formatDate } from '@/lib/stats';

export default function ProgressScreen() {
  const theme = useTheme();
  const { ready, progressList, startWorkout, activeWorkout } = useWorkouts();
  const topGrowth = progressList
    .filter((p) => p.volumeChangePct !== null && p.volumeChangePct > 0 && p.sessions.length >= 2)
    .slice(0, 3);

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
            <Title>Your growth</Title>
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
                        {p.firstBestWeight} → {p.lastBestWeight} kg · {p.sessions.length}{' '}
                        sessions
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
            actionLabel={activeWorkout ? 'Continue workout' : 'Start a workout'}
            onAction={() => {
              if (!activeWorkout) startWorkout();
              router.push('/workout/active');
            }}
          />
        }
        renderItem={({ item }) => {
          const growth = formatGrowth(item.volumeChangePct);
          const positive =
            item.volumeChangePct !== null && item.volumeChangePct > 0;
          const negative =
            item.volumeChangePct !== null && item.volumeChangePct < 0;

          return (
            <Pressable
              onPress={() => router.push(`/exercise/${item.exerciseId}`)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}>
              <View style={styles.rowBetween}>
                <Body style={{ fontWeight: '700', flex: 1, fontSize: 17 }}>
                  {item.exerciseName}
                </Body>
                <Body
                  style={{
                    fontWeight: '800',
                    color: positive
                      ? theme.success
                      : negative
                        ? theme.danger
                        : theme.textSecondary,
                  }}>
                  {growth}
                </Body>
              </View>
              <View style={{ marginTop: 8, gap: 8 }}>
                <MuscleTags
                  primary={item.muscleGroup}
                  secondary={item.secondaryMuscleGroups}
                />
                <Muted>{item.sessions.length} sessions total</Muted>
              </View>
              <Muted style={{ marginTop: 10 }}>
                Best load: {item.firstBestWeight} → {item.lastBestWeight} kg · Best
                reps: {item.firstBestReps} → {item.lastBestReps}
              </Muted>
              <Muted style={{ marginTop: 4 }}>
                {progressionProgressLabel(item)}
                {item.lastSessionAt
                  ? ` · Last ${formatDate(item.lastSessionAt)}`
                  : ''}
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
