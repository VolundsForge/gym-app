import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Exercise, Workout } from '@/types/workout';

const KEYS = {
  workouts: '@gym/workouts',
  exercises: '@gym/exercises',
  activeWorkout: '@gym/activeWorkout',
  dismissedSuggestions: '@gym/dismissedSuggestions',
} as const;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadWorkouts(): Promise<Workout[]> {
  return readJson<Workout[]>(KEYS.workouts, []);
}

export async function saveWorkouts(workouts: Workout[]): Promise<void> {
  await writeJson(KEYS.workouts, workouts);
}

export async function loadExercises(): Promise<Exercise[] | null> {
  return readJson<Exercise[] | null>(KEYS.exercises, null);
}

export async function saveExercises(exercises: Exercise[]): Promise<void> {
  await writeJson(KEYS.exercises, exercises);
}

export async function loadActiveWorkout(): Promise<Workout | null> {
  return readJson<Workout | null>(KEYS.activeWorkout, null);
}

export async function saveActiveWorkout(workout: Workout | null): Promise<void> {
  if (workout === null) {
    await AsyncStorage.removeItem(KEYS.activeWorkout);
    return;
  }
  await writeJson(KEYS.activeWorkout, workout);
}

export async function loadDismissedSuggestions(): Promise<string[]> {
  return readJson<string[]>(KEYS.dismissedSuggestions, []);
}

export async function saveDismissedSuggestions(ids: string[]): Promise<void> {
  await writeJson(KEYS.dismissedSuggestions, ids);
}
