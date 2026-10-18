import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { useWorkouts } from '@/context/WorkoutContext';
import { useElapsedClock } from '@/hooks/useElapsedClock';
import { isEmptyDraftWorkout, isComposingWorkout } from '@/lib/workout-plan';
import {
  hideWorkoutTimerNotification,
  showWorkoutTimerNotification,
} from '@/lib/workout-notification';

export function WorkoutTimerHost() {
  const { timerEnabled } = useSettings();
  const { activeWorkout } = useWorkouts();
  const onPhone = Platform.OS === 'ios' || Platform.OS === 'android';
  const running =
    onPhone &&
    timerEnabled &&
    !!activeWorkout &&
    !isComposingWorkout(activeWorkout) &&
    !isEmptyDraftWorkout(activeWorkout);
  const elapsed = useElapsedClock(activeWorkout?.startedAt, running);
  const lastShown = useRef<string>('');

  useEffect(() => {
    if (!running || !activeWorkout || !elapsed) {
      lastShown.current = '';
      void hideWorkoutTimerNotification();
      return;
    }

    const key = `${activeWorkout.id}:${elapsed}`;
    if (lastShown.current === key) return;
    lastShown.current = key;
    void showWorkoutTimerNotification(activeWorkout.name, elapsed);
  }, [running, elapsed, activeWorkout]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (!running || !activeWorkout || !elapsed) return;
      void showWorkoutTimerNotification(activeWorkout.name, elapsed);
    });
    return () => sub.remove();
  }, [running, activeWorkout, elapsed]);

  return null;
}
