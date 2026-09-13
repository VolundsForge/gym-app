export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Arms'
  | 'Legs'
  | 'Core'
  | 'Cardio'
  | 'Full Body';

export type Equipment = 'Machine' | 'Barbell / Dumbbell' | 'Bodyweight';

export type Exercise = {
  id: string;
  name: string;
  /** Main intended muscle — used for categories, filters, and alternatives. */
  muscleGroup: MuscleGroup;
  /** Other muscles trained alongside the primary, if any. */
  secondaryMuscleGroups?: MuscleGroup[];
  /** How the exercise is performed — used to filter gym vs travel sessions. */
  equipment: Equipment;
  isCustom?: boolean;
};

export type SetEntry = {
  id: string;
  reps: number;
  weight: number; // kg
  completed: boolean;
};

export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  secondaryMuscleGroups?: MuscleGroup[];
  sets: SetEntry[];
  notes?: string;
};

export type Workout = {
  id: string;
  name: string;
  startedAt: string; // ISO
  finishedAt?: string; // ISO
  exercises: WorkoutExercise[];
};

export type WorkoutStats = {
  totalWorkouts: number;
  workoutsThisWeek: number;
  totalSets: number;
  lastWorkoutAt?: string;
};
