import type {
  Exercise,
  MuscleGroup,
  ProgressionSnooze,
  Workout,
} from '@/types/workout';
import {
  buildExerciseProgressMap,
  type ExerciseProgress,
  type ExerciseSessionSnapshot,
} from '@/lib/progress';
import { formatWeight, type WeightUnit } from '@/lib/weight';

/** Default repeats of the same sets / reps / weight combo before a nudge. */
export const PROGRESSION_SESSION_THRESHOLD = 10;
export const PROGRESSION_THRESHOLD_MIN = 2;
export const PROGRESSION_THRESHOLD_MAX = 20;
export const PROGRESSION_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export function clampProgressionThreshold(value: number): number {
  if (!Number.isFinite(value)) return PROGRESSION_SESSION_THRESHOLD;
  return Math.min(
    PROGRESSION_THRESHOLD_MAX,
    Math.max(PROGRESSION_THRESHOLD_MIN, Math.round(value))
  );
}

export function comboKeyFromLoad(
  sets: number,
  reps: number,
  weightKg: number
): string {
  return `${Math.max(1, Math.round(sets))}x${Math.max(1, Math.round(reps))}@${roundWeight(weightKg)}`;
}

function comboKey(session: ExerciseSessionSnapshot): string {
  return comboKeyFromLoad(session.totalSets, session.avgReps, session.avgWeight);
}

/** Trailing streak of the same sets / reps / weight combo (oldest → newest). */
export function trailingComboStreak(
  sessions: ExerciseSessionSnapshot[]
): ExerciseSessionSnapshot[] {
  if (sessions.length === 0) return [];
  const key = comboKey(sessions[sessions.length - 1]);
  const streak: ExerciseSessionSnapshot[] = [];
  for (let i = sessions.length - 1; i >= 0; i -= 1) {
    if (comboKey(sessions[i]) !== key) break;
    streak.push(sessions[i]);
  }
  return streak.reverse();
}

export type ProgressionKind = 'reps' | 'sets' | 'weight';

export type ProgressiveSuggestion = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  kind: ProgressionKind;
  title: string;
  message: string;
  /** Human baseline e.g. "3×8 @ 40 kg" */
  currentLabel: string;
  /** Human target e.g. "3×10 @ 40 kg" */
  targetLabel: string;
  sessionCount: number;
  baseline: {
    weight: number;
    reps: number;
    sets: number;
  };
  target: {
    weight: number;
    reps: number;
    sets: number;
  };
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function roundWeight(kg: number): number {
  // Prefer gym-friendly 2.5 kg steps when sensible
  return Math.round(kg * 2) / 2;
}

function sessionsInWindow(
  sessions: ExerciseSessionSnapshot[],
  now = Date.now()
): ExerciseSessionSnapshot[] {
  return sessions.filter(
    (s) => now - new Date(s.date).getTime() <= PROGRESSION_WINDOW_MS
  );
}

/**
 * Decide a small step up from recent performance.
 * Prefers reps first, then weight, then an extra set — gentle progression.
 */
function buildStep(
  recent: ExerciseSessionSnapshot[]
): ProgressiveSuggestion['baseline'] & {
  kind: ProgressionKind;
  target: ProgressiveSuggestion['target'];
} {
  const lastThree = recent.slice(-3);
  const weight = roundWeight(median(lastThree.map((s) => s.avgWeight)));
  const reps = Math.round(median(lastThree.map((s) => s.avgReps)));
  const sets = Math.round(median(lastThree.map((s) => s.totalSets)));

  const baseline = {
    weight: Math.max(0, weight),
    reps: Math.max(1, reps),
    sets: Math.max(1, sets),
  };

  // If reps are still in a hypertrophy-friendly range, add reps first
  if (baseline.reps < 12) {
    const nextReps = Math.min(15, baseline.reps + 2);
    return {
      ...baseline,
      kind: 'reps',
      target: { ...baseline, reps: nextReps },
    };
  }

  // Higher rep range → small weight bump (or bodyweight: add a set)
  if (baseline.weight >= 5) {
    const bump = baseline.weight >= 60 ? 2.5 : 2.5;
    return {
      ...baseline,
      kind: 'weight',
      target: {
        ...baseline,
        weight: roundWeight(baseline.weight + bump),
        // often drop 1–2 reps when adding load
        reps: Math.max(6, baseline.reps - 1),
      },
    };
  }

  // Bodyweight / light work → extra set
  return {
    ...baseline,
    kind: 'sets',
    target: { ...baseline, sets: baseline.sets + 1 },
  };
}

function labelFor(
  kind: ProgressionKind,
  b: { weight: number; reps: number; sets: number },
  unit: WeightUnit
) {
  if (b.weight > 0) {
    return `${b.sets}×${b.reps} @ ${formatWeight(b.weight, unit)}`;
  }
  return `${b.sets}×${b.reps} (bodyweight)`;
}

function messageFor(
  kind: ProgressionKind,
  name: string,
  count: number,
  baseline: ProgressiveSuggestion['baseline'],
  target: ProgressiveSuggestion['target'],
  unit: WeightUnit
): { title: string; message: string } {
  if (kind === 'reps') {
    return {
      title: `Time to push ${name}`,
      message: `You've repeated this load on ${name} ${count} times. Try aiming for ${target.reps} reps instead of ~${baseline.reps} — a small step that builds real growth.`,
    };
  }
  if (kind === 'weight') {
    return {
      title: `Ready for a little more load`,
      message: `You've held this combo on ${name} for ${count} sessions. Next time try ~${formatWeight(target.weight, unit)} (you’ve been around ${formatWeight(baseline.weight, unit)}). Keep form clean.`,
    };
  }
  return {
    title: `Add one more set`,
    message: `You've repeated this combo on ${name} ${count} times. Try ${target.sets} sets instead of ${baseline.sets} to keep progressing.`,
  };
}

export function getProgressiveSuggestions(
  workouts: Workout[],
  exercises: Exercise[],
  dismissedIds: string[] = [],
  unit: WeightUnit = 'kg',
  options?: {
    enabled?: boolean;
    threshold?: number;
    now?: number;
    snoozes?: ProgressionSnooze[];
  }
): ProgressiveSuggestion[] {
  if (options?.enabled === false) return [];

  const threshold = clampProgressionThreshold(
    options?.threshold ?? PROGRESSION_SESSION_THRESHOLD
  );
  const now = options?.now ?? Date.now();
  const snoozes = options?.snoozes ?? [];
  const dismissed = new Set(dismissedIds);
  const progressMap = buildExerciseProgressMap(workouts, exercises);
  const suggestions: ProgressiveSuggestion[] = [];

  for (const progress of progressMap.values()) {
    const windowSessions = sessionsInWindow(progress.sessions, now);
    const streak = trailingComboStreak(windowSessions);
    if (streak.length === 0) continue;
    const key = comboKey(streak[streak.length - 1]);
    const snooze = snoozes.find(
      (item) => item.exerciseId === progress.exerciseId && item.comboKey === key
    );
    const needed = Math.max(threshold, snooze?.minStreak ?? 0);
    if (streak.length < needed) continue;

    const step = buildStep(streak);
    const id = `prog_${progress.exerciseId}_${step.kind}_${streak.length}`;
    if (dismissed.has(id) || dismissed.has(`exercise:${progress.exerciseId}`)) {
      continue;
    }

    const { title, message } = messageFor(
      step.kind,
      progress.exerciseName,
      streak.length,
      { weight: step.weight, reps: step.reps, sets: step.sets },
      step.target,
      unit
    );

    suggestions.push({
      id,
      exerciseId: progress.exerciseId,
      exerciseName: progress.exerciseName,
      muscleGroup: progress.muscleGroup,
      kind: step.kind,
      title,
      message,
      currentLabel: labelFor(step.kind, {
        weight: step.weight,
        reps: step.reps,
        sets: step.sets,
      }, unit),
      targetLabel: labelFor(step.kind, step.target, unit),
      sessionCount: streak.length,
      baseline: {
        weight: step.weight,
        reps: step.reps,
        sets: step.sets,
      },
      target: step.target,
    });
  }

  // Most sessions first — strongest consistency signal
  return suggestions.sort((a, b) => b.sessionCount - a.sessionCount);
}

/** Other exercises that train the same primary muscle group (categories, not secondaries). */
export function getAlternativeExercises(
  exerciseId: string,
  exercises: Exercise[],
  limit = 8
): Exercise[] {
  const current = exercises.find((e) => e.id === exerciseId);
  if (!current) return [];

  return exercises
    .filter(
      (e) =>
        e.id !== exerciseId &&
        e.muscleGroup === current.muscleGroup &&
        e.muscleGroup !== 'Cardio'
    )
    .slice(0, limit);
}

export function getAlternativesByMuscle(
  muscleGroup: MuscleGroup,
  exercises: Exercise[],
  excludeId?: string,
  limit = 8
): Exercise[] {
  return exercises
    .filter(
      (e) =>
        e.muscleGroup === muscleGroup &&
        e.id !== excludeId &&
        e.muscleGroup !== 'Cardio'
    )
    .slice(0, limit);
}

export function progressionProgressLabel(
  progress: ExerciseProgress,
  threshold = PROGRESSION_SESSION_THRESHOLD
): string {
  const n = trailingComboStreak(sessionsInWindow(progress.sessions)).length;
  const goal = clampProgressionThreshold(threshold);
  if (n >= goal) {
    return `Ready for a push (${n} at this combo)`;
  }
  return `${n}/${goal} at this combo toward a growth tip`;
}
