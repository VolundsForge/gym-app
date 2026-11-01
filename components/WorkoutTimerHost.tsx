import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { useWorkouts } from '@/context/WorkoutContext';
import { useElapsedClock } from '@/hooks/useElapsedClock';
import { isLiveSessionWorkout } from '@/lib/workout-plan';
import {
  cancelIdleWorkoutReminder,
  hideWorkoutTimerNotification,
  requestTimerPermissions,
  scheduleIdleWorkoutReminder,
  showWorkoutTimerNotification,
  subscribeIdleReminderTap,
} from '@/lib/workout-notification';

export function WorkoutTimerHost() {
  const { timerEnabled } = useSettings();
  const { activeWorkout } = useWorkouts();
  const onPhone = Platform.OS === 'ios' || Platform.OS === 'android';
  const liveSession = isLiveSessionWorkout(activeWorkout);
  const running = onPhone && timerEnabled && liveSession;
  const elapsed = useElapsedClock(activeWorkout?.startedAt, running);
  const lastShown = useRef<string>('');
  const workoutName = activeWorkout?.name ?? '';

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

  useEffect(() => {
    if (!onPhone || !liveSession) return;
    void requestTimerPermissions();
  }, [onPhone, liveSession]);

  useEffect(() => {
    if (!onPhone) return;

    const syncIdleReminder = (state: AppStateStatus) => {
      if (liveSession && state !== 'active') {
        void scheduleIdleWorkoutReminder(workoutName);
        return;
      }
      void cancelIdleWorkoutReminder();
    };

    syncIdleReminder(AppState.currentState);
    const sub = AppState.addEventListener('change', syncIdleReminder);
    return () => {
      sub.remove();
      // Keep a scheduled OS reminder if the session is still live (app may be killed).
      if (!liveSession) {
        void cancelIdleWorkoutReminder();
      }
    };
  }, [onPhone, liveSession, workoutName]);

  useEffect(() => {
    if (!onPhone) return;
    return subscribeIdleReminderTap(() => {
      router.push('/workout/active');
    });
  }, [onPhone]);

  return null;
}
