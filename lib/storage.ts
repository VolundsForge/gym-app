import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  Exercise,
  ExerciseNextPlan,
  ProgressionSnooze,
  Workout,
  WorkoutTemplate,
} from '@/types/workout';

const KEYS = {
  workouts: '@gym/workouts',
  exercises: '@gym/exercises',
  activeWorkout: '@gym/activeWorkout',
  dismissedSuggestions: '@gym/dismissedSuggestions',
  colorScheme: '@gym/colorScheme',
  profile: '@gym/profile',
  templates: '@gym/templates',
  timerEnabled: '@gym/timerEnabled',
  weightUnit: '@gym/weightUnit',
  progressionNudgesEnabled: '@gym/progressionNudgesEnabled',
  progressionSessionThreshold: '@gym/progressionSessionThreshold',
  progressionSnoozes: '@gym/progressionSnoozes',
  exerciseNextPlans: '@gym/exerciseNextPlans',
} as const;

export type ColorScheme = 'light' | 'dark';

export type UserProfile = {
  name: string;
};

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

export async function loadColorScheme(): Promise<ColorScheme | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.colorScheme);
    if (raw === 'light' || raw === 'dark') return raw;
    return null;
  } catch {
    return null;
  }
}

export async function saveColorScheme(scheme: ColorScheme): Promise<void> {
  await AsyncStorage.setItem(KEYS.colorScheme, scheme);
}

export async function loadProfile(): Promise<UserProfile> {
  return readJson<UserProfile>(KEYS.profile, { name: '' });
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await writeJson(KEYS.profile, profile);
}

export async function loadTemplates(): Promise<WorkoutTemplate[]> {
  return readJson<WorkoutTemplate[]>(KEYS.templates, []);
}

export async function saveTemplates(templates: WorkoutTemplate[]): Promise<void> {
  await writeJson(KEYS.templates, templates);
}

export async function loadTimerEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.timerEnabled);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function saveTimerEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.timerEnabled, enabled ? 'true' : 'false');
}

export async function loadWeightUnit(): Promise<'kg' | 'lbs'> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.weightUnit);
    if (raw === 'lbs' || raw === 'kg') return raw;
    return 'kg';
  } catch {
    return 'kg';
  }
}

export async function saveWeightUnit(unit: 'kg' | 'lbs'): Promise<void> {
  await AsyncStorage.setItem(KEYS.weightUnit, unit);
}

export async function loadProgressionNudgesEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.progressionNudgesEnabled);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export async function saveProgressionNudgesEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(
    KEYS.progressionNudgesEnabled,
    enabled ? 'true' : 'false'
  );
}

export async function loadProgressionSessionThreshold(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.progressionSessionThreshold);
    const n = raw == null ? NaN : Number(raw);
    if (!Number.isFinite(n)) return 10;
    return Math.min(20, Math.max(2, Math.round(n)));
  } catch {
    return 10;
  }
}

export async function saveProgressionSessionThreshold(value: number): Promise<void> {
  const n = Math.min(20, Math.max(2, Math.round(value)));
  await AsyncStorage.setItem(KEYS.progressionSessionThreshold, String(n));
}

export async function loadProgressionSnoozes(): Promise<ProgressionSnooze[]> {
  return readJson<ProgressionSnooze[]>(KEYS.progressionSnoozes, []);
}

export async function saveProgressionSnoozes(
  snoozes: ProgressionSnooze[]
): Promise<void> {
  await writeJson(KEYS.progressionSnoozes, snoozes);
}

export async function loadExerciseNextPlans(): Promise<ExerciseNextPlan[]> {
  return readJson<ExerciseNextPlan[]>(KEYS.exerciseNextPlans, []);
}

export async function saveExerciseNextPlans(
  plans: ExerciseNextPlan[]
): Promise<void> {
  await writeJson(KEYS.exerciseNextPlans, plans);
}
