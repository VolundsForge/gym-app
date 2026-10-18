import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';

import { Body, Button, Muted, Title, useTheme } from '@/components/ui';
import { formatClockSeconds } from '@/lib/stats';
import { cardioElapsedSeconds } from '@/lib/workout-plan';
import type { WorkoutExercise } from '@/types/workout';

export function useCardioClock(exercise: WorkoutExercise): number {
  const running = !!exercise.timerStartedAt;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;

    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });

    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [running, exercise.timerStartedAt]);

  return cardioElapsedSeconds(exercise, running ? now : Date.now());
}

export function CardioTimer({
  exercise,
  onStart,
  onPause,
  onReset,
}: {
  exercise: WorkoutExercise;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}) {
  const theme = useTheme();
  const seconds = useCardioClock(exercise);
  const running = !!exercise.timerStartedAt;
  const completed = !!exercise.completed;

  return (
    <View style={{ gap: 12, alignItems: 'center' }}>
      <Muted>{running ? 'Timing' : completed ? 'Done' : 'Time'}</Muted>
      <Title
        style={{
          fontSize: 44,
          lineHeight: 50,
          letterSpacing: -1,
          fontVariant: ['tabular-nums'],
        }}>
        {formatClockSeconds(seconds)}
      </Title>
      <View style={styles.actions}>
        {running ? (
          <Button label="Pause" variant="secondary" onPress={onPause} style={styles.action} />
        ) : (
          <Button
            label={seconds > 0 ? 'Resume' : 'Start'}
            onPress={onStart}
            disabled={completed}
            style={styles.action}
          />
        )}
      </View>
      {!running && seconds > 0 && !completed ? (
        <Pressable onPress={onReset} hitSlop={8}>
          <Body style={{ color: theme.textSecondary, fontWeight: '600' }}>Reset</Body>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  action: {
    flex: 1,
  },
});
