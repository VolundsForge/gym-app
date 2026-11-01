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
import { createId, indexById } from '@/lib/id';
import {
  getExerciseProgress,
  listExerciseProgress,
  type ExerciseProgress,
} from '@/lib/progress';
import { computeStats } from '@/lib/stats';
import {
  comboKeyFromLoad,
  getAlternativeExercises,
  getProgressiveSuggestions,
  type ProgressiveSuggestion,
} from '@/lib/suggestions';
import { useSettings } from '@/context/SettingsContext';
import type { GymBackup } from '@/lib/backup';
import {
  loadActiveWorkout,
  loadDismissedSuggestions,
  loadExerciseNextPlans,
  loadExercises,
  loadProgressionSnoozes,
  loadTemplates,
  loadWorkouts,
  saveActiveWorkout,
  saveDismissedSuggestions,
  saveExerciseNextPlans,
  saveExercises,
  saveProgressionSnoozes,
  saveTemplates,
  saveWorkouts,
} from '@/lib/storage';
import {
  allSetsComplete,
  cloneExercisesForReuse,
  exercisesWithCompletedSetsOnly,
  freezeCardioExercise,
  isTimedExercise,
  isEmptyDraftWorkout,
  nextGenericWorkoutName,
  pendingSetsAreReady,
  usesWeight,
} from '@/lib/workout-plan';
import type {
  Equipment,
  Exercise,
  ExerciseNextPlan,
  MuscleGroup,
  ProgressionSnooze,
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
  exerciseNextPlans: ExerciseNextPlan[];
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
  cancelActiveWorkout: () => Promise<Workout | null>;
  discardActiveWorkout: () => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  reorderTemplates: (orderedIds: string[]) => Promise<void>;
  getWorkout: (id: string) => Workout | undefined;
  addCustomExercise: (
    name: string,
    muscleGroup: MuscleGroup,
    secondaryMuscleGroups?: MuscleGroup[],
    equipment?: Equipment,
    notes?: string
  ) => Promise<Exercise>;
  setExerciseNotes: (exerciseId: string, notes: string) => Promise<void>;
  updateExerciseNotes: (workoutExerciseId: string, notes: string) => Promise<void>;
  startCardioTimer: (workoutExerciseId: string) => Promise<void>;
  pauseCardioTimer: (workoutExerciseId: string) => Promise<void>;
  resetCardioTimer: (workoutExerciseId: string) => Promise<void>;
  setCardioComplete: (
    workoutExerciseId: string,
    completed: boolean
  ) => Promise<void>;
  deleteCustomExercise: (id: string) => Promise<void>;
  getProgressFor: (exerciseId: string) => ExerciseProgress | undefined;
  getAlternatives: (exerciseId: string) => Exercise[];
  dismissSuggestion: (suggestionId: string) => Promise<void>;
  suggestionsForWorkout: (workout: Workout) => ProgressiveSuggestion[];
  applyExerciseNextPlans: (plans: ExerciseNextPlan[]) => Promise<void>;
  delayGrowthTips: (
    suggestions: ProgressiveSuggestion[],
    extraSessions: number
  ) => Promise<void>;
  restoreSnapshot: (backup: GymBackup) => Promise<void>;
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
  const { weightUnit, progressionNudgesEnabled, progressionSessionThreshold } =
    useSettings();
  const [ready, setReady] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [progressionSnoozes, setProgressionSnoozes] = useState<ProgressionSnooze[]>(
    []
  );
  const [exerciseNextPlans, setExerciseNextPlans] = useState<ExerciseNextPlan[]>(
    []
  );
  const desiredActiveRef = useRef<Workout | null>(null);
  const activeSaveChain = useRef(Promise.resolve());
  const discardedRef = useRef(false);
  const workoutsRef = useRef(workouts);
  const exercisesRef = useRef(exercises);
  const dismissedRef = useRef(dismissedSuggestions);
  const snoozesRef = useRef(progressionSnoozes);
  const nextPlansRef = useRef(exerciseNextPlans);
  workoutsRef.current = workouts;
  exercisesRef.current = exercises;
  dismissedRef.current = dismissedSuggestions;
  snoozesRef.current = progressionSnoozes;
  nextPlansRef.current = exerciseNextPlans;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [
        storedWorkouts,
        storedExercises,
        storedActive,
        storedDismissed,
        storedTemplates,
        storedSnoozes,
        storedPlans,
      ] = await Promise.all([
        loadWorkouts(),
        loadExercises(),
        loadActiveWorkout(),
        loadDismissedSuggestions(),
        loadTemplates(),
        loadProgressionSnoozes(),
        loadExerciseNextPlans(),
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
      setProgressionSnoozes(storedSnoozes);
      setExerciseNextPlans(storedPlans);
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
    exercisesRef.current = next;
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
    const catalog = exercisesRef.current.find((item) => item.id === exerciseId);
    const logsWeight = usesWeight(catalog?.equipment, catalog?.muscleGroup);
    const plan = nextPlansRef.current.find((item) => item.exerciseId === exerciseId);
    if (plan) {
      const count = Math.max(1, Math.round(plan.sets));
      const seed = {
        reps: Math.max(1, Math.round(plan.reps)),
        weight: logsWeight ? plan.weight : 0,
      };
      return Array.from({ length: count }, () => emptySet(seed));
    }
    const progress = getExerciseProgress(
      workoutsRef.current,
      exercisesRef.current,
      exerciseId
    );
    const last = progress?.sessions[progress.sessions.length - 1];
    const seed = {
      reps: last ? Math.round(last.avgReps) : 8,
      weight: logsWeight && last ? Math.round(last.avgWeight * 2) / 2 : 0,
    };
    return [emptySet(seed), emptySet(seed), emptySet(seed)];
  }, []);

  const toWorkoutExercise = useCallback(
    (exercise: Exercise, sets?: SetEntry[]): WorkoutExercise => {
      const timed = isTimedExercise(exercise);
      return {
        id: createId('wex'),
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        secondaryMuscleGroups: normalizeSecondaryMuscleGroups(
          exercise.muscleGroup,
          exercise.secondaryMuscleGroups
        ),
        equipment: normalizeEquipment(exercise.equipment),
        sets: timed ? [] : (sets ?? seededSets(exercise.id)),
        notes: exercise.notes,
        timed: timed || undefined,
        durationSeconds: timed ? 0 : undefined,
        completed: timed ? false : undefined,
      };
    },
    [seededSets]
  );

  const unusedWorkoutName = useCallback(
    (preferred?: string) => {
      const trimmed = preferred?.trim();
      if (trimmed) return trimmed;
      return nextGenericWorkoutName([
        ...workoutsRef.current.map((item) => item.name),
        ...templates.map((item) => item.name),
        desiredActiveRef.current?.name ?? '',
      ]);
    },
    [templates]
  );

  const startWorkout = useCallback(
    (name?: string) => {
      discardedRef.current = false;
      const workout: Workout = {
        id: createId('workout'),
        name: name?.trim() ?? '',
        startedAt: new Date().toISOString(),
        exercises: [],
        phase: 'building',
        purpose: 'compose',
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
      const catalogById = indexById(exercisesRef.current);
      const workout: Workout = {
        id: createId('workout'),
        name,
        startedAt: new Date().toISOString(),
        exercises: cloneExercisesForReuse(sourceExercises).map((ex) => {
          const catalog = catalogById.get(ex.exerciseId);
          return {
            ...ex,
            equipment: catalog?.equipment ?? ex.equipment,
            timed: catalog?.timed ?? ex.timed,
            notes: catalog ? catalog.notes : ex.notes,
          };
        }),
        phase: 'review',
        purpose: 'session',
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

  const setExerciseNotes = useCallback(
    async (exerciseId: string, notes: string) => {
      const trimmed = notes.trim() ? notes : undefined;
      const nextLibrary = exercisesRef.current.map((item) =>
        item.id === exerciseId ? { ...item, notes: trimmed } : item
      );
      await persistExercises(nextLibrary);

      await patchActive((current) => {
        const pendingMatch = current.pendingExercise?.exerciseId === exerciseId;
        const listMatch = current.exercises.some((ex) => ex.exerciseId === exerciseId);
        if (!pendingMatch && !listMatch) return current;
        return {
          ...current,
          pendingExercise:
            pendingMatch && current.pendingExercise
              ? { ...current.pendingExercise, notes: trimmed }
              : current.pendingExercise,
          exercises: current.exercises.map((ex) =>
            ex.exerciseId === exerciseId ? { ...ex, notes: trimmed } : ex
          ),
        };
      });
    },
    [persistExercises, patchActive]
  );

  const updateExerciseNotes = useCallback(
    async (workoutExerciseId: string, notes: string) => {
      const current = desiredActiveRef.current;
      if (!current) return;
      const target =
        current.pendingExercise?.id === workoutExerciseId
          ? current.pendingExercise
          : current.exercises.find((ex) => ex.id === workoutExerciseId);
      if (!target) return;
      await setExerciseNotes(target.exerciseId, notes);
    },
    [setExerciseNotes]
  );

  const startCardioTimer = useCallback(
    async (workoutExerciseId: string) => {
      await mapActiveExercise(workoutExerciseId, (ex) => {
        if (!isTimedExercise(ex) || ex.timerStartedAt) return ex;
        return {
          ...ex,
          completed: false,
          timerStartedAt: new Date().toISOString(),
        };
      });
    },
    [mapActiveExercise]
  );

  const pauseCardioTimer = useCallback(
    async (workoutExerciseId: string) => {
      await mapActiveExercise(workoutExerciseId, (ex) =>
        isTimedExercise(ex) ? freezeCardioExercise(ex) : ex
      );
    },
    [mapActiveExercise]
  );

  const resetCardioTimer = useCallback(
    async (workoutExerciseId: string) => {
      await mapActiveExercise(workoutExerciseId, (ex) => {
        if (!isTimedExercise(ex)) return ex;
        return {
          ...ex,
          durationSeconds: 0,
          timerStartedAt: undefined,
          completed: false,
        };
      });
    },
    [mapActiveExercise]
  );

  const setCardioComplete = useCallback(
    async (workoutExerciseId: string, completed: boolean) => {
      await mapActiveExercise(workoutExerciseId, (ex) => {
        if (!isTimedExercise(ex)) return ex;
        return {
          ...freezeCardioExercise(ex),
          completed,
        };
      });
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
      const name = unusedWorkoutName(workout.name);
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
    [templates, persistTemplates, unusedWorkoutName]
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

    if (current.purpose === 'compose') {
      await upsertTemplateFromWorkout({
        ...current,
        name: unusedWorkoutName(current.name),
        exercises: exercisesList,
        pendingExercise: null,
      });
      await persistActive(null);
      return true;
    }

    await persistActive({
      ...current,
      exercises: exercisesList,
      pendingExercise: null,
      phase: 'review',
    });
    return true;
  }, [persistActive, unusedWorkoutName, upsertTemplateFromWorkout]);

  const reopenBuilder = useCallback(async () => {
    await patchActive((current) => ({
      ...current,
      phase: 'building',
    }));
  }, [patchActive]);

  const finishWorkout = useCallback(async () => {
    const current = desiredActiveRef.current;
    if (!current || current.exercises.length === 0) return null;

    const completedExercises = exercisesWithCompletedSetsOnly(current.exercises);
    if (completedExercises.length === 0) {
      await persistActive(null);
      return null;
    }

    const fullyDone = current.exercises.every(allSetsComplete);
    const finished: Workout = {
      id: current.id,
      name: current.name,
      startedAt: current.startedAt,
      finishedAt: new Date().toISOString(),
      exercises: completedExercises,
    };

    const next = [finished, ...workouts.filter((w) => w.id !== finished.id)];
    await persistWorkouts(next);
    if (fullyDone) {
      await upsertTemplateFromWorkout(finished);
    }
    const doneIds = new Set(completedExercises.map((ex) => ex.exerciseId));
    const remainingPlans = nextPlansRef.current.filter(
      (plan) => !doneIds.has(plan.exerciseId)
    );
    if (remainingPlans.length !== nextPlansRef.current.length) {
      setExerciseNextPlans(remainingPlans);
      await saveExerciseNextPlans(remainingPlans);
    }
    await persistActive(null);
    return finished;
  }, [workouts, persistWorkouts, persistActive, upsertTemplateFromWorkout]);

  const discardActiveWorkout = useCallback(async () => {
    await persistActive(null);
  }, [persistActive]);

  const cancelActiveWorkout = useCallback(async () => {
    const current = desiredActiveRef.current;
    if (!current) return null;

    if (current.purpose === 'compose') {
      await persistActive(null);
      return null;
    }

    const completedExercises = exercisesWithCompletedSetsOnly(current.exercises);
    if (completedExercises.length === 0) {
      await persistActive(null);
      return null;
    }

    const finished: Workout = {
      id: current.id,
      name: current.name,
      startedAt: current.startedAt,
      finishedAt: new Date().toISOString(),
      exercises: completedExercises,
    };

    const next = [finished, ...workouts.filter((w) => w.id !== finished.id)];
    await persistWorkouts(next);
    await persistActive(null);
    return finished;
  }, [workouts, persistWorkouts, persistActive]);

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

  const reorderTemplates = useCallback(
    async (orderedIds: string[]) => {
      const byId = new Map(templates.map((item) => [item.id, item]));
      const next: WorkoutTemplate[] = [];
      for (const id of orderedIds) {
        const item = byId.get(id);
        if (!item) continue;
        next.push(item);
        byId.delete(id);
      }
      for (const rest of byId.values()) next.push(rest);
      await persistTemplates(next);
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
      equipment?: Equipment,
      notes?: string
    ) => {
      const trimmedNotes = notes?.trim();
      const exercise: Exercise = {
        id: createId('ex'),
        name: name.trim(),
        muscleGroup,
        secondaryMuscleGroups: normalizeSecondaryMuscleGroups(
          muscleGroup,
          secondaryMuscleGroups
        ),
        equipment: normalizeEquipment(equipment),
        notes: trimmedNotes ? trimmedNotes : undefined,
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
    () =>
      getProgressiveSuggestions(workouts, exercises, dismissedSuggestions, weightUnit, {
        enabled: progressionNudgesEnabled,
        threshold: progressionSessionThreshold,
        snoozes: progressionSnoozes,
      }),
    [
      workouts,
      exercises,
      dismissedSuggestions,
      weightUnit,
      progressionNudgesEnabled,
      progressionSessionThreshold,
      progressionSnoozes,
    ]
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

  const suggestionsForWorkout = useCallback(
    (workout: Workout) => {
      if (!progressionNudgesEnabled) return [];
      const merged = [
        workout,
        ...workoutsRef.current.filter((item) => item.id !== workout.id),
      ];
      const ids = new Set(workout.exercises.map((ex) => ex.exerciseId));
      return getProgressiveSuggestions(
        merged,
        exercisesRef.current,
        dismissedRef.current,
        weightUnit,
        {
          enabled: true,
          threshold: progressionSessionThreshold,
          snoozes: snoozesRef.current,
        }
      ).filter((tip) => ids.has(tip.exerciseId));
    },
    [progressionNudgesEnabled, progressionSessionThreshold, weightUnit]
  );

  const applyExerciseNextPlans = useCallback(
    async (plans: ExerciseNextPlan[]) => {
      const byId = new Map(plans.map((plan) => [plan.exerciseId, plan]));
      const merged = [
        ...exerciseNextPlans.filter((plan) => !byId.has(plan.exerciseId)),
        ...plans,
      ];
      setExerciseNextPlans(merged);
      await saveExerciseNextPlans(merged);

      const touched = new Set(plans.map((plan) => plan.exerciseId));
      const nextTemplates = templates.map((template) => {
        let changed = false;
        const exercisesList = template.exercises.map((ex) => {
          const plan = byId.get(ex.exerciseId);
          if (!plan || isTimedExercise(ex)) return ex;
          changed = true;
          const count = Math.max(1, Math.round(plan.sets));
          const seed = {
            reps: Math.max(1, Math.round(plan.reps)),
            weight: plan.weight,
          };
          return {
            ...ex,
            sets: Array.from({ length: count }, () => emptySet(seed)),
          };
        });
        if (!changed) return template;
        return {
          ...template,
          exercises: exercisesList,
          updatedAt: new Date().toISOString(),
        };
      });
      if (nextTemplates.some((template, index) => template !== templates[index])) {
        await persistTemplates(nextTemplates);
      }

      const nextDismissed = [
        ...new Set([
          ...dismissedSuggestions,
          ...progressiveSuggestions
            .filter((tip) => touched.has(tip.exerciseId))
            .map((tip) => tip.id),
        ]),
      ];
      setDismissedSuggestions(nextDismissed);
      await saveDismissedSuggestions(nextDismissed);

      const nextSnoozes = progressionSnoozes.filter(
        (item) => !touched.has(item.exerciseId)
      );
      if (nextSnoozes.length !== progressionSnoozes.length) {
        setProgressionSnoozes(nextSnoozes);
        await saveProgressionSnoozes(nextSnoozes);
      }
    },
    [
      exerciseNextPlans,
      templates,
      persistTemplates,
      dismissedSuggestions,
      progressiveSuggestions,
      progressionSnoozes,
    ]
  );

  const delayGrowthTips = useCallback(
    async (suggestions: ProgressiveSuggestion[], extraSessions: number) => {
      const extra = Math.max(1, Math.round(extraSessions));
      const byExercise = new Map(
        suggestions.map((tip) => [
          tip.exerciseId,
          {
            exerciseId: tip.exerciseId,
            comboKey: comboKeyFromLoad(
              tip.baseline.sets,
              tip.baseline.reps,
              tip.baseline.weight
            ),
            minStreak: tip.sessionCount + extra,
          } satisfies ProgressionSnooze,
        ])
      );
      const next = [
        ...progressionSnoozes.filter((item) => !byExercise.has(item.exerciseId)),
        ...byExercise.values(),
      ];
      setProgressionSnoozes(next);
      await saveProgressionSnoozes(next);
    },
    [progressionSnoozes]
  );

  const restoreSnapshot = useCallback(async (backup: GymBackup) => {
    const mergedExercises =
      backup.exercises.length > 0
        ? mergeExerciseLibrary(backup.exercises)
        : DEFAULT_EXERCISES;

    discardedRef.current = true;
    desiredActiveRef.current = null;
    setActiveWorkout(null);
    await saveActiveWorkout(null);
    discardedRef.current = false;

    setWorkouts(backup.workouts);
    setTemplates(backup.templates);
    exercisesRef.current = mergedExercises;
    setExercises(mergedExercises);
    setDismissedSuggestions(backup.dismissedSuggestions);
    dismissedRef.current = backup.dismissedSuggestions;
    setProgressionSnoozes(backup.progressionSnoozes);
    snoozesRef.current = backup.progressionSnoozes;
    setExerciseNextPlans(backup.exerciseNextPlans);
    nextPlansRef.current = backup.exerciseNextPlans;

    await Promise.all([
      saveWorkouts(backup.workouts),
      saveTemplates(backup.templates),
      saveExercises(mergedExercises),
      saveDismissedSuggestions(backup.dismissedSuggestions),
      saveProgressionSnoozes(backup.progressionSnoozes),
      saveExerciseNextPlans(backup.exerciseNextPlans),
    ]);
  }, []);

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
      exerciseNextPlans,
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
      cancelActiveWorkout,
      discardActiveWorkout,
      deleteWorkout,
      deleteTemplate,
      reorderTemplates,
      getWorkout,
      addCustomExercise,
      setExerciseNotes,
      updateExerciseNotes,
      startCardioTimer,
      pauseCardioTimer,
      resetCardioTimer,
      setCardioComplete,
      deleteCustomExercise,
      getProgressFor,
      getAlternatives,
      dismissSuggestion,
      suggestionsForWorkout,
      applyExerciseNextPlans,
      delayGrowthTips,
      restoreSnapshot,
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
      exerciseNextPlans,
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
      cancelActiveWorkout,
      discardActiveWorkout,
      deleteWorkout,
      deleteTemplate,
      reorderTemplates,
      getWorkout,
      addCustomExercise,
      setExerciseNotes,
      updateExerciseNotes,
      startCardioTimer,
      pauseCardioTimer,
      resetCardioTimer,
      setCardioComplete,
      deleteCustomExercise,
      getProgressFor,
      getAlternatives,
      dismissSuggestion,
      suggestionsForWorkout,
      applyExerciseNextPlans,
      delayGrowthTips,
      restoreSnapshot,
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

