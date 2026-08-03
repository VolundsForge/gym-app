import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DEFAULT_EXERCISES } from '@/lib/exercises';
import { createId } from '@/lib/id';
import {
  getExerciseProgress,
  listExerciseProgress,
  type ExerciseProgress,
} from '@/lib/progress';
import { computeStats } from '@/lib/stats';
import {
  getAlternativeExercises,
  getProgressiveSuggestions,
  type ProgressiveSuggestion,
} from '@/lib/suggestions';
import {
  loadActiveWorkout,
  loadDismissedSuggestions,
  loadExercises,
  loadWorkouts,
  saveActiveWorkout,
  saveDismissedSuggestions,
  saveExercises,
  saveWorkouts,
} from '@/lib/storage';
import type {
  Exercise,
  MuscleGroup,
  SetEntry,
  Workout,
  WorkoutExercise,
  WorkoutStats,
} from '@/types/workout';

type WorkoutContextValue = {
  ready: boolean;
  workouts: Workout[];
  exercises: Exercise[];
  activeWorkout: Workout | null;
  stats: WorkoutStats;
  progressList: ExerciseProgress[];
  progressiveSuggestions: ProgressiveSuggestion[];
  startWorkout: (name?: string) => Workout;
  updateActiveWorkout: (workout: Workout) => Promise<void>;
  addExerciseToActive: (exercise: Exercise) => Promise<void>;
  replaceExerciseInActive: (
    workoutExerciseId: string,
    withExercise: Exercise
  ) => Promise<void>;
  addSet: (workoutExerciseId: string) => Promise<void>;
  updateSet: (
    workoutExerciseId: string,
    setId: string,
    patch: Partial<Pick<SetEntry, 'reps' | 'weight' | 'completed'>>
  ) => Promise<void>;
  removeSet: (workoutExerciseId: string, setId: string) => Promise<void>;
  removeExerciseFromActive: (workoutExerciseId: string) => Promise<void>;
  finishWorkout: () => Promise<Workout | null>;
  discardActiveWorkout: () => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  getWorkout: (id: string) => Workout | undefined;
  addCustomExercise: (name: string, muscleGroup: MuscleGroup) => Promise<Exercise>;
  deleteCustomExercise: (id: string) => Promise<void>;
  getProgressFor: (exerciseId: string) => ExerciseProgress | undefined;
  getAlternatives: (exerciseId: string) => Exercise[];
  dismissSuggestion: (suggestionId: string) => Promise<void>;
};

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

function emptySet(seed?: { reps?: number; weight?: number }): SetEntry {
  return {
    id: createId('set'),
    reps: seed?.reps ?? 8,
    weight: seed?.weight ?? 0,
    completed: false,
  };
}

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [storedWorkouts, storedExercises, storedActive, storedDismissed] =
        await Promise.all([
          loadWorkouts(),
          loadExercises(),
          loadActiveWorkout(),
          loadDismissedSuggestions(),
        ]);

      if (cancelled) return;

      setWorkouts(storedWorkouts);
      if (storedExercises && storedExercises.length > 0) {
        // Merge any new built-in exercises the user doesn't have yet
        const byId = new Map(storedExercises.map((e) => [e.id, e]));
        for (const def of DEFAULT_EXERCISES) {
          if (!byId.has(def.id)) byId.set(def.id, def);
        }
        const merged = [...byId.values()];
        setExercises(merged);
        await saveExercises(merged);
      } else {
        setExercises(DEFAULT_EXERCISES);
        await saveExercises(DEFAULT_EXERCISES);
      }
      setActiveWorkout(storedActive);
      setDismissedSuggestions(storedDismissed);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistWorkouts = useCallback(async (next: Workout[]) => {
    setWorkouts(next);
    await saveWorkouts(next);
  }, []);

  const persistActive = useCallback(async (next: Workout | null) => {
    setActiveWorkout(next);
    await saveActiveWorkout(next);
  }, []);

  const persistExercises = useCallback(async (next: Exercise[]) => {
    setExercises(next);
    await saveExercises(next);
  }, []);

  const startWorkout = useCallback((name?: string) => {
    const workout: Workout = {
      id: createId('workout'),
      name: name?.trim() || defaultWorkoutName(),
      startedAt: new Date().toISOString(),
      exercises: [],
    };
    setActiveWorkout(workout);
    void saveActiveWorkout(workout);
    return workout;
  }, []);

  const updateActiveWorkout = useCallback(
    async (workout: Workout) => {
      await persistActive(workout);
    },
    [persistActive]
  );

  const addExerciseToActive = useCallback(
    async (exercise: Exercise) => {
      if (!activeWorkout) return;

      const existing = activeWorkout.exercises.find(
        (e) => e.exerciseId === exercise.id
      );
      if (existing) return;

      const progress = getExerciseProgress(workouts, exercises, exercise.id);
      const last = progress?.sessions[progress.sessions.length - 1];

      const entry: WorkoutExercise = {
        id: createId('wex'),
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        sets: [
          emptySet({
            reps: last ? Math.round(last.avgReps) : 8,
            weight: last ? Math.round(last.avgWeight * 2) / 2 : 0,
          }),
          emptySet({
            reps: last ? Math.round(last.avgReps) : 8,
            weight: last ? Math.round(last.avgWeight * 2) / 2 : 0,
          }),
          emptySet({
            reps: last ? Math.round(last.avgReps) : 8,
            weight: last ? Math.round(last.avgWeight * 2) / 2 : 0,
          }),
        ],
      };

      await persistActive({
        ...activeWorkout,
        exercises: [...activeWorkout.exercises, entry],
      });
    },
    [activeWorkout, persistActive, workouts, exercises]
  );

  const replaceExerciseInActive = useCallback(
    async (workoutExerciseId: string, withExercise: Exercise) => {
      if (!activeWorkout) return;

      const already = activeWorkout.exercises.some(
        (e) => e.exerciseId === withExercise.id && e.id !== workoutExerciseId
      );
      if (already) return;

      const progress = getExerciseProgress(workouts, exercises, withExercise.id);
      const last = progress?.sessions[progress.sessions.length - 1];

      await persistActive({
        ...activeWorkout,
        exercises: activeWorkout.exercises.map((ex) => {
          if (ex.id !== workoutExerciseId) return ex;
          return {
            ...ex,
            exerciseId: withExercise.id,
            exerciseName: withExercise.name,
            muscleGroup: withExercise.muscleGroup,
            sets: ex.sets.map((s) => ({
              ...s,
              weight: last ? Math.round(last.avgWeight * 2) / 2 : s.weight,
              reps: last ? Math.round(last.avgReps) : s.reps,
              completed: false,
            })),
          };
        }),
      });
    },
    [activeWorkout, persistActive, workouts, exercises]
  );

  const mapActiveExercise = useCallback(
    async (
      workoutExerciseId: string,
      mapper: (ex: WorkoutExercise) => WorkoutExercise
    ) => {
      if (!activeWorkout) return;
      await persistActive({
        ...activeWorkout,
        exercises: activeWorkout.exercises.map((ex) =>
          ex.id === workoutExerciseId ? mapper(ex) : ex
        ),
      });
    },
    [activeWorkout, persistActive]
  );

  const addSet = useCallback(
    async (workoutExerciseId: string) => {
      await mapActiveExercise(workoutExerciseId, (ex) => {
        const last = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: createId('set'),
              reps: last?.reps ?? 8,
              weight: last?.weight ?? 0,
              completed: false,
            },
          ],
        };
      });
    },
    [mapActiveExercise]
  );

  const updateSet = useCallback(
    async (
      workoutExerciseId: string,
      setId: string,
      patch: Partial<Pick<SetEntry, 'reps' | 'weight' | 'completed'>>
    ) => {
      await mapActiveExercise(workoutExerciseId, (ex) => ({
        ...ex,
        sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
      }));
    },
    [mapActiveExercise]
  );

  const removeSet = useCallback(
    async (workoutExerciseId: string, setId: string) => {
      await mapActiveExercise(workoutExerciseId, (ex) => ({
        ...ex,
        sets: ex.sets.filter((s) => s.id !== setId),
      }));
    },
    [mapActiveExercise]
  );

  const removeExerciseFromActive = useCallback(
    async (workoutExerciseId: string) => {
      if (!activeWorkout) return;
      await persistActive({
        ...activeWorkout,
        exercises: activeWorkout.exercises.filter((e) => e.id !== workoutExerciseId),
      });
    },
    [activeWorkout, persistActive]
  );

  const finishWorkout = useCallback(async () => {
    if (!activeWorkout) return null;

    const finished: Workout = {
      ...activeWorkout,
      finishedAt: new Date().toISOString(),
      exercises: activeWorkout.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.filter((s) => s.completed || s.reps > 0),
      })),
    };

    const next = [finished, ...workouts.filter((w) => w.id !== finished.id)];
    await persistWorkouts(next);
    await persistActive(null);
    return finished;
  }, [activeWorkout, workouts, persistWorkouts, persistActive]);

  const discardActiveWorkout = useCallback(async () => {
    await persistActive(null);
  }, [persistActive]);

  const deleteWorkout = useCallback(
    async (id: string) => {
      await persistWorkouts(workouts.filter((w) => w.id !== id));
    },
    [workouts, persistWorkouts]
  );

  const getWorkout = useCallback(
    (id: string) => {
      if (activeWorkout?.id === id) return activeWorkout;
      return workouts.find((w) => w.id === id);
    },
    [activeWorkout, workouts]
  );

  const addCustomExercise = useCallback(
    async (name: string, muscleGroup: MuscleGroup) => {
      const exercise: Exercise = {
        id: createId('ex'),
        name: name.trim(),
        muscleGroup,
        isCustom: true,
      };
      await persistExercises([exercise, ...exercises]);
      return exercise;
    },
    [exercises, persistExercises]
  );

  const deleteCustomExercise = useCallback(
    async (id: string) => {
      await persistExercises(exercises.filter((e) => !(e.id === id && e.isCustom)));
    },
    [exercises, persistExercises]
  );

  const progressList = useMemo(
    () => listExerciseProgress(workouts, exercises),
    [workouts, exercises]
  );

  const progressiveSuggestions = useMemo(
    () => getProgressiveSuggestions(workouts, exercises, dismissedSuggestions),
    [workouts, exercises, dismissedSuggestions]
  );

  const getProgressFor = useCallback(
    (exerciseId: string) => getExerciseProgress(workouts, exercises, exerciseId),
    [workouts, exercises]
  );

  const getAlternatives = useCallback(
    (exerciseId: string) => getAlternativeExercises(exerciseId, exercises),
    [exercises]
  );

  const dismissSuggestion = useCallback(
    async (suggestionId: string) => {
      const next = [...new Set([...dismissedSuggestions, suggestionId])];
      setDismissedSuggestions(next);
      await saveDismissedSuggestions(next);
    },
    [dismissedSuggestions]
  );

  const stats = useMemo(() => computeStats(workouts), [workouts]);

  const value = useMemo<WorkoutContextValue>(
    () => ({
      ready,
      workouts,
      exercises,
      activeWorkout,
      stats,
      progressList,
      progressiveSuggestions,
      startWorkout,
      updateActiveWorkout,
      addExerciseToActive,
      replaceExerciseInActive,
      addSet,
      updateSet,
      removeSet,
      removeExerciseFromActive,
      finishWorkout,
      discardActiveWorkout,
      deleteWorkout,
      getWorkout,
      addCustomExercise,
      deleteCustomExercise,
      getProgressFor,
      getAlternatives,
      dismissSuggestion,
    }),
    [
      ready,
      workouts,
      exercises,
      activeWorkout,
      stats,
      progressList,
      progressiveSuggestions,
      startWorkout,
      updateActiveWorkout,
      addExerciseToActive,
      replaceExerciseInActive,
      addSet,
      updateSet,
      removeSet,
      removeExerciseFromActive,
      finishWorkout,
      discardActiveWorkout,
      deleteWorkout,
      getWorkout,
      addCustomExercise,
      deleteCustomExercise,
      getProgressFor,
      getAlternatives,
      dismissSuggestion,
    ]
  );

  return (
    <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
  );
}

export function useWorkouts() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) {
    throw new Error('useWorkouts must be used within WorkoutProvider');
  }
  return ctx;
}

function defaultWorkoutName(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning Workout';
  if (hour < 17) return 'Afternoon Workout';
  return 'Evening Workout';
}
