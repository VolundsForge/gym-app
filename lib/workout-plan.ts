import { normalizeEquipment } from '@/lib/exercises';
import { createId } from '@/lib/id';
import { formatClockSeconds, formatDuration } from '@/lib/stats';
import { formatWeight, type WeightUnit } from '@/lib/weight';
import type {
  Equipment,
  Exercise,
  MuscleGroup,
  Workout,
  WorkoutExercise,
  WorkoutPhase,
} from '@/types/workout';

export function usesWeight(
  equipment?: Equipment | null,
  muscleGroup?: MuscleGroup
): boolean {
  if (muscleGroup === 'Cardio') return false;
  return normalizeEquipment(equipment) !== 'Bodyweight';
}

/** Catalog equipment wins so bodyweight library items never ask for load. */
export function resolvedEquipment(
  item: {
    equipment?: Equipment | null;
    muscleGroup?: MuscleGroup;
    exerciseId?: string;
  },
  catalog?: Pick<Exercise, 'id' | 'equipment'>[] | Map<string, Pick<Exercise, 'equipment'>>
): Equipment | undefined {
  if (!catalog) return item.equipment ?? undefined;
  const id = item.exerciseId;
  if (!id) return item.equipment ?? undefined;
  if (catalog instanceof Map) return catalog.get(id)?.equipment ?? item.equipment ?? undefined;
  return catalog.find((entry) => entry.id === id)?.equipment ?? item.equipment ?? undefined;
}

export function exerciseUsesWeight(
  item: {
    equipment?: Equipment | null;
    muscleGroup?: MuscleGroup;
    exerciseId?: string;
    timed?: boolean;
    id?: string;
  },
  catalog?: Pick<Exercise, 'id' | 'equipment'>[] | Map<string, Pick<Exercise, 'equipment'>>
): boolean {
  if (isTimedExercise(item)) return false;
  return usesWeight(resolvedEquipment(item, catalog), item.muscleGroup);
}

export function isCardioExercise(exercise: {
  muscleGroup?: MuscleGroup;
}): boolean {
  return exercise.muscleGroup === 'Cardio';
}

const TIMED_EXERCISE_IDS = new Set(['ex_plank']);

/** Cardio and timed holds (e.g. Plank) log duration instead of sets and reps. */
export function isTimedExercise(exercise: {
  muscleGroup?: MuscleGroup;
  timed?: boolean;
  exerciseId?: string;
  id?: string;
}): boolean {
  if (exercise.timed || isCardioExercise(exercise)) return true;
  const id = exercise.exerciseId ?? exercise.id;
  return !!id && TIMED_EXERCISE_IDS.has(id);
}

export function cardioElapsedSeconds(
  exercise: WorkoutExercise,
  now = Date.now()
): number {
  const base = Math.max(0, Math.floor(exercise.durationSeconds ?? 0));
  if (!exercise.timerStartedAt) return base;
  const running = Math.max(
    0,
    Math.floor((now - new Date(exercise.timerStartedAt).getTime()) / 1000)
  );
  return base + running;
}

export function freezeCardioExercise(
  exercise: WorkoutExercise,
  now = Date.now()
): WorkoutExercise {
  if (!isTimedExercise(exercise)) return exercise;
  return {
    ...exercise,
    durationSeconds: cardioElapsedSeconds(exercise, now),
    timerStartedAt: undefined,
  };
}

export function cardioCountsAsComplete(exercise: WorkoutExercise): boolean {
  return !!exercise.completed || cardioElapsedSeconds(exercise) > 0;
}

export function workoutPhase(workout: Workout | null | undefined): WorkoutPhase {
  return workout?.phase === 'review' ? 'review' : 'building';
}

/** True when a session was opened but nothing has been added yet. */
export function isEmptyDraftWorkout(workout: Workout | null | undefined): boolean {
  if (!workout) return true;
  return workout.exercises.length === 0 && !workout.pendingExercise;
}

/** Creating a workout to save to My Workouts, not performing it yet. */
export function isComposingWorkout(workout: Workout | null | undefined): boolean {
  return !!workout && workout.purpose === 'compose';
}

/** An in-progress session the user is performing (ticks, timer, finish). */
export function isLiveSessionWorkout(workout: Workout | null | undefined): boolean {
  return !!workout && !isEmptyDraftWorkout(workout) && !isComposingWorkout(workout);
}

/** Next unused generic name: Workout, then Workout 1, Workout 2, … */
export function nextGenericWorkoutName(existing: string[]): string {
  const used = new Set(
    existing.map((name) => name.trim().toLowerCase()).filter(Boolean)
  );
  if (!used.has('workout')) return 'Workout';
  let n = 1;
  while (used.has(`workout ${n}`)) n += 1;
  return `Workout ${n}`;
}

export function allSetsComplete(exercise: WorkoutExercise): boolean {
  if (isTimedExercise(exercise)) return !!exercise.completed;
  return exercise.sets.length > 0 && exercise.sets.every((set) => set.completed);
}

/** Exercises that still have at least one ticked set, keeping only those sets. */
export function exercisesWithCompletedSetsOnly(
  exercises: WorkoutExercise[]
): WorkoutExercise[] {
  return exercises
    .map((exercise) => {
      if (isTimedExercise(exercise)) {
        if (!cardioCountsAsComplete(exercise)) return null;
        return {
          ...freezeCardioExercise(exercise),
          completed: true,
          sets: [],
        };
      }
      const sets = exercise.sets.filter((set) => set.completed);
      if (sets.length === 0) return null;
      return { ...exercise, sets };
    })
    .filter((exercise): exercise is WorkoutExercise => exercise != null);
}

export function workoutHasCompletedSets(
  workout: Workout | null | undefined
): boolean {
  return !!workout?.exercises.some((exercise) =>
    isTimedExercise(exercise)
      ? cardioCountsAsComplete(exercise)
      : exercise.sets.some((set) => set.completed)
  );
}

export function workoutAllSetsComplete(
  workout: Workout | null | undefined
): boolean {
  if (!workout?.exercises.length) return false;
  return workout.exercises.every(allSetsComplete);
}

/** Finished session with at least one exercise that has logged sets. */
export function isLoggedWorkout(workout: Workout | null | undefined): boolean {
  if (!workout?.finishedAt) return false;
  return workout.exercises.some((ex) =>
    isTimedExercise(ex)
      ? cardioCountsAsComplete(ex)
      : ex.sets.some((set) => set.reps > 0)
  );
}

export function formatExercisePlan(
  exercise: WorkoutExercise,
  unit: WeightUnit = 'kg',
  catalog?: Pick<Exercise, 'id' | 'equipment'>[]
): string {
  if (isTimedExercise(exercise)) {
    const seconds = cardioElapsedSeconds(exercise);
    return seconds > 0 ? formatClockSeconds(seconds) : 'Time';
  }

  const sets = exercise.sets;
  if (sets.length === 0) return 'No sets';

  const showWeight = exerciseUsesWeight(exercise, catalog);
  const reps = sets.map((s) => s.reps);
  const weights = sets.map((s) => s.weight);
  const sameReps = reps.every((r) => r === reps[0]);
  const sameWeight = weights.every((w) => w === weights[0]);

  if (showWeight) {
    if (sameReps && sameWeight) {
      return `${sets.length} × ${reps[0]} reps @ ${formatWeight(weights[0], unit)}`;
    }
    return sets
      .map((s) => `${s.reps} reps × ${formatWeight(s.weight, unit)}`)
      .join(' · ');
  }

  if (sameReps) return `${sets.length} × ${reps[0]} reps`;
  return sets.map((s) => `${s.reps} reps`).join(' · ');
}

export function cloneExercisesForReuse(
  exercises: WorkoutExercise[]
): WorkoutExercise[] {
  return exercises.map((ex) => ({
    ...ex,
    id: createId('wex'),
    sets: ex.sets.map((s) => ({
      id: createId('set'),
      reps: s.reps,
      weight: s.weight,
      completed: false,
    })),
    completed: false,
    timerStartedAt: undefined,
    durationSeconds: isTimedExercise(ex) ? 0 : undefined,
  }));
}

export function formatWorkoutListMeta(workout: Workout): string {
  const count = workout.exercises.length;
  const sets = workout.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.completed).length,
    0
  );
  const parts = [
    `${count} exercise${count === 1 ? '' : 's'}`,
    sets > 0 ? `${sets} set${sets === 1 ? '' : 's'}` : null,
    formatDuration(workout.startedAt, workout.finishedAt),
  ].filter((part): part is string => !!part);
  return parts.join(' · ');
}

export function pendingSetsAreReady(exercise: WorkoutExercise | null | undefined): boolean {
  if (!exercise) return false;
  if (isTimedExercise(exercise)) return true;
  if (exercise.sets.length === 0) return false;
  return exercise.sets.every((s) => s.reps > 0);
}
