export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Arms'
  | 'Legs'
  | 'Core'
  | 'Cardio'
  | 'Full Body';

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
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
