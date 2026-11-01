import Constants from 'expo-constants';

import type { WeightUnit } from '@/lib/weight';
import {
  loadDismissedSuggestions,
  loadExerciseNextPlans,
  loadExercises,
  loadProfile,
  loadProgressionNudgesEnabled,
  loadProgressionSessionThreshold,
  loadProgressionSnoozes,
  loadTemplates,
  loadTimerEnabled,
  loadWeightUnit,
  loadWorkouts,
  type UserProfile,
} from '@/lib/storage';
import type {
  Exercise,
  ExerciseNextPlan,
  ProgressionSnooze,
  Workout,
  WorkoutTemplate,
} from '@/types/workout';

export const BACKUP_FORMAT = 1;

export type GymBackup = {
  format: typeof BACKUP_FORMAT;
  appVersion: string;
  exportedAt: string;
  workouts: Workout[];
  templates: WorkoutTemplate[];
  exercises: Exercise[];
  dismissedSuggestions: string[];
  progressionSnoozes: ProgressionSnooze[];
  exerciseNextPlans: ExerciseNextPlan[];
  profile: UserProfile;
  settings: {
    timerEnabled: boolean;
    weightUnit: WeightUnit;
    progressionNudgesEnabled: boolean;
    progressionSessionThreshold: number;
  };
};

export function appVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

export function backupFileName(backup: Pick<GymBackup, 'appVersion' | 'exportedAt'>): string {
  const day = backup.exportedAt.slice(0, 10);
  const safeVersion = backup.appVersion.replace(/[^0-9A-Za-z.-]+/g, '-');
  return `gym-tracker-${safeVersion}-${day}.json`;
}

export async function buildGymBackup(): Promise<GymBackup> {
  const [
    workouts,
    templates,
    exercises,
    dismissedSuggestions,
    progressionSnoozes,
    exerciseNextPlans,
    profile,
    timerEnabled,
    weightUnit,
    progressionNudgesEnabled,
    progressionSessionThreshold,
  ] = await Promise.all([
    loadWorkouts(),
    loadTemplates(),
    loadExercises(),
    loadDismissedSuggestions(),
    loadProgressionSnoozes(),
    loadExerciseNextPlans(),
    loadProfile(),
    loadTimerEnabled(),
    loadWeightUnit(),
    loadProgressionNudgesEnabled(),
    loadProgressionSessionThreshold(),
  ]);

  return {
    format: BACKUP_FORMAT,
    appVersion: appVersion(),
    exportedAt: new Date().toISOString(),
    workouts,
    templates,
    exercises: exercises ?? [],
    dismissedSuggestions,
    progressionSnoozes,
    exerciseNextPlans,
    profile,
    settings: {
      timerEnabled,
      weightUnit,
      progressionNudgesEnabled,
      progressionSessionThreshold,
    },
  };
}

export function serializeGymBackup(backup: GymBackup): string {
  return JSON.stringify(backup);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function parseGymBackup(raw: string): GymBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That file is not a Gym Tracker snapshot.');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('That file is not a Gym Tracker snapshot.');
  }
  const data = parsed as Record<string, unknown>;
  if (data.format !== BACKUP_FORMAT) {
    throw new Error(
      'This snapshot is from a newer app format. Update Gym Tracker, then restore it.'
    );
  }
  const settings =
    data.settings && typeof data.settings === 'object'
      ? (data.settings as Record<string, unknown>)
      : {};
  const profile =
    data.profile && typeof data.profile === 'object'
      ? (data.profile as Record<string, unknown>)
      : {};
  const weightUnit = settings.weightUnit === 'lbs' ? 'lbs' : 'kg';

  return {
    format: BACKUP_FORMAT,
    appVersion: typeof data.appVersion === 'string' ? data.appVersion : 'unknown',
    exportedAt:
      typeof data.exportedAt === 'string'
        ? data.exportedAt
        : new Date().toISOString(),
    workouts: asArray<Workout>(data.workouts),
    templates: asArray<WorkoutTemplate>(data.templates),
    exercises: asArray<Exercise>(data.exercises),
    dismissedSuggestions: asArray<string>(data.dismissedSuggestions),
    progressionSnoozes: asArray<ProgressionSnooze>(data.progressionSnoozes),
    exerciseNextPlans: asArray<ExerciseNextPlan>(data.exerciseNextPlans),
    profile: { name: typeof profile.name === 'string' ? profile.name : '' },
    settings: {
      timerEnabled: settings.timerEnabled === true,
      weightUnit,
      progressionNudgesEnabled: settings.progressionNudgesEnabled !== false,
      progressionSessionThreshold:
        typeof settings.progressionSessionThreshold === 'number'
          ? settings.progressionSessionThreshold
          : 10,
    },
  };
}

export function backupSummary(backup: GymBackup): string {
  const workouts = backup.workouts.length;
  const templates = backup.templates.length;
  const day = backup.exportedAt.slice(0, 10);
  return `${workouts} workout${workouts === 1 ? '' : 's'}, ${templates} saved workout${
    templates === 1 ? '' : 's'
  }, from ${backup.appVersion} (${day}).`;
}
