import { normalizeSecondaryMuscleGroups } from '@/lib/exercises';
import type { Exercise, MuscleGroup, Workout } from '@/types/workout';

export type ExerciseSessionSnapshot = {
  workoutId: string;
  workoutName: string;
  date: string; // ISO (finishedAt preferred)
  bestWeight: number;
  bestReps: number;
  totalSets: number;
  volume: number;
  avgReps: number;
  avgWeight: number;
};

export type ExerciseProgress = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  secondaryMuscleGroups: MuscleGroup[];
  sessions: ExerciseSessionSnapshot[];
  sessionsInLast3Months: number;
  firstSessionAt?: string;
  lastSessionAt?: string;
  firstVolume: number;
  lastVolume: number;
  volumeChangePct: number | null;
  firstBestWeight: number;
  lastBestWeight: number;
  weightChange: number;
  firstBestReps: number;
  lastBestReps: number;
  repsChange: number;
};

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

function sessionDate(workout: Workout): string {
  return workout.finishedAt ?? workout.startedAt;
}

/** Build per-exercise progress from finished workouts (oldest → newest). */
export function buildExerciseProgressMap(
  workouts: Workout[],
  exerciseCatalog: Exercise[]
): Map<string, ExerciseProgress> {
  const finished = workouts
    .filter((w) => w.finishedAt)
    .sort(
      (a, b) =>
        new Date(sessionDate(a)).getTime() - new Date(sessionDate(b)).getTime()
    );

  const byExercise = new Map<
    string,
    {
      name: string;
      muscleGroup: MuscleGroup;
      secondaryMuscleGroups: MuscleGroup[];
      sessions: ExerciseSessionSnapshot[];
    }
  >();

  for (const workout of finished) {
    for (const ex of workout.exercises) {
      const completed = ex.sets.filter((s) => s.completed);
      if (completed.length === 0) continue;

      const volume = completed.reduce((sum, s) => sum + s.weight * s.reps, 0);
      const bestWeight = Math.max(...completed.map((s) => s.weight));
      const bestReps = Math.max(...completed.map((s) => s.reps));
      const avgReps =
        completed.reduce((sum, s) => sum + s.reps, 0) / completed.length;
      const avgWeight =
        completed.reduce((sum, s) => sum + s.weight, 0) / completed.length;

      const existing = byExercise.get(ex.exerciseId);
      const snapshot: ExerciseSessionSnapshot = {
        workoutId: workout.id,
        workoutName: workout.name,
        date: sessionDate(workout),
        bestWeight,
        bestReps,
        totalSets: completed.length,
        volume,
        avgReps,
        avgWeight,
      };

      if (existing) {
        existing.sessions.push(snapshot);
        existing.name = ex.exerciseName;
        existing.muscleGroup = ex.muscleGroup;
        existing.secondaryMuscleGroups = normalizeSecondaryMuscleGroups(
          ex.muscleGroup,
          ex.secondaryMuscleGroups
        );
      } else {
        byExercise.set(ex.exerciseId, {
          name: ex.exerciseName,
          muscleGroup: ex.muscleGroup,
          secondaryMuscleGroups: normalizeSecondaryMuscleGroups(
            ex.muscleGroup,
            ex.secondaryMuscleGroups
          ),
          sessions: [snapshot],
        });
      }
    }
  }

  // Ensure catalog names / muscle metadata for known exercises
  for (const ex of exerciseCatalog) {
    const row = byExercise.get(ex.id);
    if (row) {
      row.name = ex.name;
      row.muscleGroup = ex.muscleGroup;
      row.secondaryMuscleGroups = normalizeSecondaryMuscleGroups(
        ex.muscleGroup,
        ex.secondaryMuscleGroups
      );
    }
  }

  const now = Date.now();
  const result = new Map<string, ExerciseProgress>();

  for (const [exerciseId, row] of byExercise) {
    const sessions = row.sessions;
    const first = sessions[0];
    const last = sessions[sessions.length - 1];
    const sessionsInLast3Months = sessions.filter(
      (s) => now - new Date(s.date).getTime() <= THREE_MONTHS_MS
    ).length;

    const firstVolume = first?.volume ?? 0;
    const lastVolume = last?.volume ?? 0;
    const volumeChangePct =
      firstVolume > 0
        ? Math.round(((lastVolume - firstVolume) / firstVolume) * 100)
        : lastVolume > 0
          ? 100
          : null;

    result.set(exerciseId, {
      exerciseId,
      exerciseName: row.name,
      muscleGroup: row.muscleGroup,
      secondaryMuscleGroups: row.secondaryMuscleGroups,
      sessions,
      sessionsInLast3Months,
      firstSessionAt: first?.date,
      lastSessionAt: last?.date,
      firstVolume,
      lastVolume,
      volumeChangePct,
      firstBestWeight: first?.bestWeight ?? 0,
      lastBestWeight: last?.bestWeight ?? 0,
      weightChange: (last?.bestWeight ?? 0) - (first?.bestWeight ?? 0),
      firstBestReps: first?.bestReps ?? 0,
      lastBestReps: last?.bestReps ?? 0,
      repsChange: (last?.bestReps ?? 0) - (first?.bestReps ?? 0),
    });
  }

  return result;
}

export function listExerciseProgress(
  workouts: Workout[],
  exerciseCatalog: Exercise[]
): ExerciseProgress[] {
  const map = buildExerciseProgressMap(workouts, exerciseCatalog);
  return [...map.values()].sort((a, b) => {
    const aTime = a.lastSessionAt ? new Date(a.lastSessionAt).getTime() : 0;
    const bTime = b.lastSessionAt ? new Date(b.lastSessionAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function getExerciseProgress(
  workouts: Workout[],
  exerciseCatalog: Exercise[],
  exerciseId: string
): ExerciseProgress | undefined {
  return buildExerciseProgressMap(workouts, exerciseCatalog).get(exerciseId);
}

/** Format growth for UI: "+12%" / "−5%" / "new". */
export function formatGrowth(pct: number | null): string {
  if (pct === null) return '—';
  if (pct > 0) return `+${pct}%`;
  if (pct < 0) return `${pct}%`;
  return '0%';
}
