import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  DEFAULT_EXERCISES,
  mergeExerciseLibrary,
  normalizeEquipment,
  normalizeSecondaryMuscleGroups,
} from '@/lib/exercises';
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
  loadTemplates,
  loadWorkouts,
  saveActiveWorkout,
  saveDismissedSuggestions,
  saveExercises,
  saveTemplates,
  saveWorkouts,
} from '@/lib/storage';
import {
  cloneExercisesForReuse,
  isEmptyDraftWorkout,
  pendingSetsAreReady,
} from '@/lib/workout-plan';
import type {
  Equipment,
  Exercise,
  MuscleGroup,
  SetEntry,
  Workout,
  WorkoutExercise,
  WorkoutStats,
  WorkoutTemplate,
} from '@/types/workout';

type WorkoutContextValue = {
  ready: boolean;
  workouts: Workout[];
  templates: WorkoutTemplate[];
  exercises: Exercise[];
  activeWorkout: Workout | null;
  stats: WorkoutStats;
  progressList: ExerciseProgress[];
  progressiveSuggestions: ProgressiveSuggestion[];
  startWorkout: (name?: string) => Workout;
  startFromTemplate: (template: WorkoutTemplate) => Workout;
  startFromWorkout: (workout: Workout) => Workout;
  updateActiveWorkout: (workout: Workout) => Promise<void>;
  renameActiveWorkout: (name: string) => Promise<void>;
  beginPendingExercise: (exercise: Exercise) => Promise<void>;
  commitPendingExercise: () => Promise<boolean>;
  cancelPendingExercise: () => Promise<void>;
  updatePendingSet: (
    setId: string,
    patch: Partial<Pick<SetEntry, 'reps' | 'weight'>>
  ) => Promise<void>;
  addPendingSet: () => Promise<void>;
  removePendingSet: (setId: string) => Promise<void>;
  editCommittedExercise: (workoutExerciseId: string) => Promise<void>;
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
  saveWorkout: () => Promise<boolean>;
  reopenBuilder: () => Promise<void>;
  finishWorkout: () => Promise<Workout | null>;
  discardActiveWorkout: () => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  getWorkout: (id: string) => Workout | undefined;
  addCustomExercise: (
    name: string,
    muscleGroup: MuscleGroup,
    secondaryMuscleGroups?: MuscleGroup[],
    equipment?: Equipment
  ) => Promise<Exercise>;
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

function defaultWorkoutName(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning Workout';
  if (hour < 17) return 'Afternoon Workout';
  return 'Evening Workout';
}

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const desiredActiveRef = useRef<Workout | null>(null);
  const activeSaveChain = useRef(Promise.resolve());
  const discardedRef = useRef(false);
  const workoutsRef = useRef(workouts);
  const exercisesRef = useRef(exercises);
  workoutsRef.current = workouts;
  exercisesRef.current = exercises;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [
        storedWorkouts,
        storedExercises,
        storedActive,
        storedDismissed,
        storedTemplates,
      ] = await Promise.all([
        loadWorkouts(),
        loadExercises(),
        loadActiveWorkout(),
        loadDismissedSuggestions(),
        loadTemplates(),
      ]);

      if (cancelled) return;

      setWorkouts(storedWorkouts);
      setTemplates(storedTemplates);
      if (storedExercises && storedExercises.length > 0) {
        const merged = mergeExerciseLibrary(storedExercises);
        setExercises(merged);
        await saveExercises(merged);
      } else {
        setExercises(DEFAULT_EXERCISES);
        await saveExercises(DEFAULT_EXERCISES);
      }
      discardedRef.current = false;
      const restored =
        storedActive && !isEmptyDraftWorkout(storedActive) ? storedActive : null;
      if (storedActive && !restored) {
        await saveActiveWorkout(null);
      }
      desiredActiveRef.current = restored;
      setActiveWorkout(restored);
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

  const persistTemplates = useCallback(async (next: WorkoutTemplate[]) => {
    setTemplates(next);
    await saveTemplates(next);
  }, []);

  const persistActive = useCallback(async (next: Workout | null) => {
    if (next === null) {
      discardedRef.current = true;
    } else if (discardedRef.current) {
      return;
    }
    desiredActiveRef.current = next;
    setActiveWorkout(next);
    const pending = activeSaveChain.current
      .catch(() => undefined)
      .then(() => saveActiveWorkout(desiredActiveRef.current));
    activeSaveChain.current = pending;
    await pending;
  }, []);

  const persistExercises = useCallback(async (next: Exercise[]) => {
    setExercises(next);
    await saveExercises(next);
  }, []);

  const patchActive = useCallback(
    async (updater: (workout: Workout) => Workout | null) => {
      const current = desiredActiveRef.current;
      if (!current) return;
      const next = updater(current);
      await persistActive(next);
    },
    [persistActive]
  );

  const seededSets = useCallback((exerciseId: string): SetEntry[] => {
    const progress = getExerciseProgress(
      workoutsRef.current,
      exercisesRef.current,
      exerciseId
    );
    const last = progress?.sessions[progress.sessions.length - 1];
    const seed = {
      reps: last ? Math.round(last.avgReps) : 8,
      weight: last ? Math.round(last.avgWeight * 2) / 2 : 0,
    };
    return [emptySet(seed), emptySet(seed), emptySet(seed)];
  }, []);

  const toWorkoutExercise = useCallback(
    (exercise: Exercise, sets?: SetEntry[]): WorkoutExercise => ({
      id: createId('wex'),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      secondaryMuscleGroups: normalizeSecondaryMuscleGroups(
        exercise.muscleGroup,
        exercise.secondaryMuscleGroups
      ),
      equipment: normalizeEquipment(exercise.equipment),
      sets: sets ?? seededSets(exercise.id),
    }),
    [seededSets]
  );

  const startWorkout = useCallback(
    (name?: string) => {
      discardedRef.current = false;
      const workout: Workout = {
        id: createId('workout'),
        name: name?.trim() || defaultWorkoutName(),
        startedAt: new Date().toISOString(),
        exercises: [],
        phase: 'building',
        pendingExercise: null,
      };
      void persistActive(workout);
      return workout;
    },
    [persistActive]
  );

  const startFromExercises = useCallback(
    (name: string, sourceExercises: WorkoutExercise[]) => {
      discardedRef.current = false;
      const workout: Workout = {
        id: createId('workout'),
        name,
        startedAt: new Date().toISOString(),
        exercises: cloneExercisesForReuse(sourceExercises),
        phase: 'review',
        pendingExercise: null,
      };
      void persistActive(workout);
      return workout;
    },
    [persistActive]
  );

  const startFromTemplate = useCallback(
    (template: WorkoutTemplate) =>
      startFromExercises(template.name, template.exercises),
    [startFromExercises]
  );

  const startFromWorkout = useCallback(
    (workout: Workout) => startFromExercises(workout.name, workout.exercises),
    [startFromExercises]
  );

  const updateActiveWorkout = useCallback(
    async (workout: Workout) => {
      await persistActive(workout);
    },
    [persistActive]
  );

  const renameActiveWorkout = useCallback(
    async (name: string) => {
      await patchActive((current) => ({ ...current, name }));
    },
    [patchActive]
  );

  const beginPendingExercise = useCallback(
    async (exercise: Exercise) => {
      const current = desiredActiveRef.current;
      if (!current) return;
      await persistActive({
        ...current,
        phase: 'building',
        pendingExercise: toWorkoutExercise(exercise),
      });
    },
    [persistActive, toWorkoutExercise]
  );

  const commitPendingExercise = useCallback(async () => {
    const current = desiredActiveRef.current;
    const pending = current?.pendingExercise;
    if (!current || !pending || !pendingSetsAreReady(pending)) return false;

    const withoutSame = current.exercises.filter(
      (e) => e.exerciseId !== pending.exerciseId
    );
    await persistActive({
      ...current,
      phase: 'building',
      exercises: [...withoutSame, pending],
      pendingExercise: null,
    });
    return true;
  }, [persistActive]);

  const cancelPendingExercise = useCallback(async () => {
    await patchActive((current) => ({
      ...current,
      pendingExercise: null,
    }));
  }, [patchActive]);

  const updatePendingSet = useCallback(
    async (setId: string, patch: Partial<Pick<SetEntry, 'reps' | 'weight'>>) => {
      await patchActive((current) => {
        const pending = current.pendingExercise;
        if (!pending) return current;
        return {
          ...current,
          pendingExercise: {
            ...pending,
            sets: pending.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
          },
        };
      });
    },
    [patchActive]
  );

  const addPendingSet = useCallback(async () => {
    await patchActive((current) => {
      const pending = current.pendingExercise;
      if (!pending) return current;
      const last = pending.sets[pending.sets.length - 1];
      return {
        ...current,
        pendingExercise: {
          ...pending,
          sets: [
            ...pending.sets,
            emptySet({ reps: last?.reps ?? 8, weight: last?.weight ?? 0 }),
          ],
        },
      };
    });
  }, [patchActive]);

  const removePendingSet = useCallback(
    async (setId: string) => {
      await patchActive((current) => {
        const pending = current.pendingExercise;
        if (!pending || pending.sets.length <= 1) return current;
        return {
          ...current,
          pendingExercise: {
            ...pending,
            sets: pending.sets.filter((s) => s.id !== setId),
          },
        };
      });
    },
    [patchActive]
  );

  const editCommittedExercise = useCallback(
    async (workoutExerciseId: string) => {
      const current = desiredActiveRef.current;
      if (!current) return;
      if (current.pendingExercise && !pendingSetsAreReady(current.pendingExercise)) {
        return;
      }

      let pending = current.pendingExercise;
      let exercisesList = current.exercises;
      if (pending && pendingSetsAreReady(pending)) {
        exercisesList = [
          ...exercisesList.filter((e) => e.exerciseId !== pending!.exerciseId),
          pending,
        ];
        pending = null;
      }

      const target = exercisesList.find((e) => e.id === workoutExerciseId);
      if (!target) return;

      await persistActive({
        ...current,
        phase: 'building',
        exercises: exercisesList.filter((e) => e.id !== workoutExerciseId),
        pendingExercise: target,
      });
    },
    [persistActive]
  );

  const addExerciseToActive = useCallback(
    async (exercise: Exercise) => {
      await beginPendingExercise(exercise);
    },
    [beginPendingExercise]
  );

  const replaceExerciseInActive = useCallback(
    async (workoutExerciseId: string, withExercise: Exercise) => {
      await patchActive((current) => {
        const already = current.exercises.some(
          (e) => e.exerciseId === withExercise.id && e.id !== workoutExerciseId
        );
        if (already) return current;

        const nextEntry = toWorkoutExercise(withExercise);
        if (current.pendingExercise?.id === workoutExerciseId) {
          return { ...current, pendingExercise: nextEntry };
        }

        return {
          ...current,
          exercises: current.exercises.map((ex) =>
            ex.id === workoutExerciseId ? { ...nextEntry, id: ex.id } : ex
          ),
        };
      });
    },
    [patchActive, toWorkoutExercise]
  );

  const mapActiveExercise = useCallback(
    async (
      workoutExerciseId: string,
      mapper: (ex: WorkoutExercise) => WorkoutExercise
    ) => {
      await patchActive((current) => {
        if (current.pendingExercise?.id === workoutExerciseId) {
          return {
            ...current,
            pendingExercise: mapper(current.pendingExercise),
          };
        }
        return {
          ...current,
          exercises: current.exercises.map((ex) =>
            ex.id === workoutExerciseId ? mapper(ex) : ex
          ),
        };
      });
    },
    [patchActive]
  );

  const addSet = useCallback(
    async (workoutExerciseId: string) => {
      await mapActiveExercise(workoutExerciseId, (ex) => {
        const last = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            emptySet({ reps: last?.reps ?? 8, weight: last?.weight ?? 0 }),
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
        sets: ex.sets.length <= 1 ? ex.sets : ex.sets.filter((s) => s.id !== setId),
      }));
    },
    [mapActiveExercise]
  );

  const removeExerciseFromActive = useCallback(
    async (workoutExerciseId: string) => {
      await patchActive((current) => ({
        ...current,
        exercises: current.exercises.filter((e) => e.id !== workoutExerciseId),
        pendingExercise:
          current.pendingExercise?.id === workoutExerciseId
            ? null
            : current.pendingExercise,
      }));
    },
    [patchActive]
  );

  const upsertTemplateFromWorkout = useCallback(
    async (workout: Workout) => {
      const name = workout.name.trim() || defaultWorkoutName();
      const now = new Date().toISOString();
      const cloned = cloneExercisesForReuse(workout.exercises);
      const existing = templates.find(
        (t) => t.name.trim().toLowerCase() === name.toLowerCase()
      );
      if (existing) {
        const next: WorkoutTemplate = {
          ...existing,
          name,
          updatedAt: now,
          exercises: cloned,
        };
        await persistTemplates(
          templates.map((t) => (t.id === existing.id ? next : t))
        );
        return;
      }
      const created: WorkoutTemplate = {
        id: createId('tpl'),
        name,
        createdAt: now,
        updatedAt: now,
        exercises: cloned,
      };
      await persistTemplates([created, ...templates]);
    },
    [templates, persistTemplates]
  );

  const saveWorkout = useCallback(async () => {
    const current = desiredActiveRef.current;
    if (!current) return false;

    let exercisesList = current.exercises;
    const pending = current.pendingExercise;
    if (pending && pendingSetsAreReady(pending)) {
      exercisesList = [
        ...exercisesList.filter((e) => e.exerciseId !== pending.exerciseId),
        pending,
      ];
    }
    if (exercisesList.length === 0) return false;

    await persistActive({
      ...current,
      exercises: exercisesList,
      pendingExercise: null,
      phase: 'review',
    });
    return true;
  }, [persistActive]);

  const reopenBuilder = useCallback(async () => {
    await patchActive((current) => ({
      ...current,
      phase: 'building',
    }));
  }, [patchActive]);

  const finishWorkout = useCallback(async () => {
    const current = desiredActiveRef.current;
    if (!current || current.exercises.length === 0) return null;

    const finished: Workout = {
      id: current.id,
      name: current.name,
      startedAt: current.startedAt,
      finishedAt: new Date().toISOString(),
      exercises: current.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.filter((s) => s.reps > 0),
      })),
    };

    const next = [finished, ...workouts.filter((w) => w.id !== finished.id)];
    await persistWorkouts(next);
    await upsertTemplateFromWorkout(finished);
    await persistActive(null);
    return finished;
  }, [workouts, persistWorkouts, persistActive, upsertTemplateFromWorkout]);

  const discardActiveWorkout = useCallback(async () => {
    await persistActive(null);
  }, [persistActive]);

  const deleteWorkout = useCallback(
    async (id: string) => {
      await persistWorkouts(workouts.filter((w) => w.id !== id));
    },
    [workouts, persistWorkouts]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      await persistTemplates(templates.filter((t) => t.id !== id));
    },
    [templates, persistTemplates]
  );

  const getWorkout = useCallback(
    (id: string) => {
      if (activeWorkout?.id === id) return activeWorkout;
      return workouts.find((w) => w.id === id);
    },
    [activeWorkout, workouts]
  );

  const addCustomExercise = useCallback(
    async (
      name: string,
      muscleGroup: MuscleGroup,
      secondaryMuscleGroups?: MuscleGroup[],
      equipment?: Equipment
    ) => {
      const exercise: Exercise = {
        id: createId('ex'),
        name: name.trim(),
        muscleGroup,
        secondaryMuscleGroups: normalizeSecondaryMuscleGroups(
          muscleGroup,
          secondaryMuscleGroups
        ),
        equipment: normalizeEquipment(equipment),
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
      templates,
      exercises,
      activeWorkout,
      stats,
      progressList,
      progressiveSuggestions,
      startWorkout,
      startFromTemplate,
      startFromWorkout,
      updateActiveWorkout,
      renameActiveWorkout,
      beginPendingExercise,
      commitPendingExercise,
      cancelPendingExercise,
      updatePendingSet,
      addPendingSet,
      removePendingSet,
      editCommittedExercise,
      addExerciseToActive,
      replaceExerciseInActive,
      addSet,
      updateSet,
      removeSet,
      removeExerciseFromActive,
      saveWorkout,
      reopenBuilder,
      finishWorkout,
      discardActiveWorkout,
      deleteWorkout,
      deleteTemplate,
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
      templates,
      exercises,
      activeWorkout,
      stats,
      progressList,
      progressiveSuggestions,
      startWorkout,
      startFromTemplate,
      startFromWorkout,
      updateActiveWorkout,
      renameActiveWorkout,
      beginPendingExercise,
      commitPendingExercise,
      cancelPendingExercise,
      updatePendingSet,
      addPendingSet,
      removePendingSet,
      editCommittedExercise,
      addExerciseToActive,
      replaceExerciseInActive,
      addSet,
      updateSet,
      removeSet,
      removeExerciseFromActive,
      saveWorkout,
      reopenBuilder,
      finishWorkout,
      discardActiveWorkout,
      deleteWorkout,
      deleteTemplate,
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

