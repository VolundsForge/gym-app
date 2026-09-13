import type { Exercise, MuscleGroup, Workout } from '@/types/workout';
import {
  buildExerciseProgressMap,
  type ExerciseProgress,
  type ExerciseSessionSnapshot,
} from '@/lib/progress';

/** ~10 logged sessions of the same exercise within ~3 months. */
export const PROGRESSION_SESSION_THRESHOLD = 10;
export const PROGRESSION_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

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

function labelFor(kind: ProgressionKind, b: { weight: number; reps: number; sets: number }) {
  if (b.weight > 0) {
    return `${b.sets}×${b.reps} @ ${b.weight} kg`;
  }
  return `${b.sets}×${b.reps} (bodyweight)`;
}

function messageFor(
  kind: ProgressionKind,
  name: string,
  count: number,
  baseline: ProgressiveSuggestion['baseline'],
  target: ProgressiveSuggestion['target']
): { title: string; message: string } {
  if (kind === 'reps') {
    return {
      title: `Time to push ${name}`,
      message: `You've logged ${name} ${count} times in the last 3 months. Try aiming for ${target.reps} reps instead of ~${baseline.reps} — a small step that builds real growth.`,
    };
  }
  if (kind === 'weight') {
    return {
      title: `Ready for a little more load`,
      message: `Strong consistency on ${name} (${count} sessions in 3 months). Next time try ~${target.weight} kg (you’ve been around ${baseline.weight} kg). Keep form clean.`,
    };
  }
  return {
    title: `Add one more set`,
    message: `You've shown up for ${name} ${count} times recently. Try ${target.sets} sets instead of ${baseline.sets} to keep progressing.`,
  };
}

export function getProgressiveSuggestions(
  workouts: Workout[],
  exercises: Exercise[],
  dismissedIds: string[] = [],
  now = Date.now()
): ProgressiveSuggestion[] {
  const dismissed = new Set(dismissedIds);
  const progressMap = buildExerciseProgressMap(workouts, exercises);
  const suggestions: ProgressiveSuggestion[] = [];

  for (const progress of progressMap.values()) {
    const windowSessions = sessionsInWindow(progress.sessions, now);
    if (windowSessions.length < PROGRESSION_SESSION_THRESHOLD) continue;

    const step = buildStep(windowSessions);
    const id = `prog_${progress.exerciseId}_${step.kind}_${windowSessions.length}`;
    if (dismissed.has(id) || dismissed.has(`exercise:${progress.exerciseId}`)) {
      continue;
    }

    const { title, message } = messageFor(
      step.kind,
      progress.exerciseName,
      windowSessions.length,
      { weight: step.weight, reps: step.reps, sets: step.sets },
      step.target
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
      }),
      targetLabel: labelFor(step.kind, step.target),
      sessionCount: windowSessions.length,
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

export function progressionProgressLabel(progress: ExerciseProgress): string {
  const n = progress.sessionsInLast3Months;
  if (n >= PROGRESSION_SESSION_THRESHOLD) {
    return `Ready for a push (${n} sessions / 3 mo)`;
  }
  return `${n}/${PROGRESSION_SESSION_THRESHOLD} sessions toward a growth tip`;
}
