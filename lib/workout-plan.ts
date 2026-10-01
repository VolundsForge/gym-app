import { normalizeEquipment } from '@/lib/exercises';
import { createId } from '@/lib/id';
import type {
  Equipment,
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

export function workoutPhase(workout: Workout | null | undefined): WorkoutPhase {
  return workout?.phase === 'review' ? 'review' : 'building';
}

/** True when a session was opened but nothing has been added yet. */
export function isEmptyDraftWorkout(workout: Workout | null | undefined): boolean {
  if (!workout) return true;
  return workout.exercises.length === 0 && !workout.pendingExercise;
}

export function allSetsComplete(exercise: WorkoutExercise): boolean {
  return exercise.sets.length > 0 && exercise.sets.every((set) => set.completed);
}

/** Finished session with at least one exercise that has logged sets. */
export function isLoggedWorkout(workout: Workout | null | undefined): boolean {
  if (!workout?.finishedAt) return false;
  return workout.exercises.some((ex) => ex.sets.some((set) => set.reps > 0));
}

export function formatExercisePlan(exercise: WorkoutExercise): string {
  const sets = exercise.sets;
  if (sets.length === 0) return 'No sets';

  const showWeight = usesWeight(exercise.equipment, exercise.muscleGroup);
  const reps = sets.map((s) => s.reps);
  const weights = sets.map((s) => s.weight);
  const sameReps = reps.every((r) => r === reps[0]);
  const sameWeight = weights.every((w) => w === weights[0]);

  if (showWeight) {
    if (sameReps && sameWeight) {
      return `${sets.length} × ${reps[0]} reps @ ${weights[0]} kg`;
    }
    return sets.map((s) => `${s.reps} reps × ${s.weight} kg`).join(' · ');
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
  }));
}

export function pendingSetsAreReady(exercise: WorkoutExercise | null | undefined): boolean {
  if (!exercise || exercise.sets.length === 0) return false;
  return exercise.sets.every((s) => s.reps > 0);
}
