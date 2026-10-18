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
  /** Freeform machine or workout notes. Not used by progress charts. */
  notes?: string;
  /** Hold or cardio work logged with a timer instead of sets and reps. */
  timed?: boolean;
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
  equipment?: Equipment;
  sets: SetEntry[];
  notes?: string;
  /** Logged cardio time for this session, in whole seconds. */
  durationSeconds?: number;
  /** ISO timestamp while a cardio timer is running. */
  timerStartedAt?: string;
  /** Cardio complete flag (sets stay empty for cardio). */
  completed?: boolean;
  /** Copied from the library when this is a timed hold or cardio. */
  timed?: boolean;
};

export type WorkoutPhase = 'building' | 'review';

/** compose = creating a workout for My Workouts; session = performing one */
export type WorkoutPurpose = 'compose' | 'session';

export type Workout = {
  id: string;
  name: string;
  startedAt: string; // ISO
  finishedAt?: string; // ISO
  exercises: WorkoutExercise[];
  /** building = filling in exercises one by one; review = saved list ready to finish */
  phase?: WorkoutPhase;
  /** compose stays off the clock until the user starts it from My Workouts */
  purpose?: WorkoutPurpose;
  /** Exercise currently being filled in, not yet added to the compact list */
  pendingExercise?: WorkoutExercise | null;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  exercises: WorkoutExercise[];
};

export type WorkoutStats = {
  totalWorkouts: number;
  workoutsThisWeek: number;
  totalSets: number;
  lastWorkoutAt?: string;
};

/** Snooze a growth tip until this combo has been logged minStreak times. */
export type ProgressionSnooze = {
  exerciseId: string;
  comboKey: string;
  minStreak: number;
};

/** Next planned sets / reps / weight after accepting a growth tip. */
export type ExerciseNextPlan = {
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number;
};
