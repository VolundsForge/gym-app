import type { Equipment, Exercise, MuscleGroup } from '@/types/workout';

/** Built-in exercise library shown on first launch. */
export const DEFAULT_EXERCISES: Exercise[] = [
  // Chest
  {
    id: 'ex_bench_press',
    name: 'Bench Press',
    muscleGroup: 'Chest',
    secondaryMuscleGroups: ['Shoulders', 'Arms'],
    equipment: 'Barbell / Dumbbell',
  },
  {
    id: 'ex_incline_db_press',
    name: 'Incline Dumbbell Press',
    muscleGroup: 'Chest',
    secondaryMuscleGroups: ['Shoulders', 'Arms'],
    equipment: 'Barbell / Dumbbell',
  },
  {
    id: 'ex_push_up',
    name: 'Push-Up',
    muscleGroup: 'Chest',
    secondaryMuscleGroups: ['Shoulders', 'Arms', 'Core'],
    equipment: 'Bodyweight',
  },
  {
    id: 'ex_cable_fly',
    name: 'Cable Fly',
    muscleGroup: 'Chest',
    secondaryMuscleGroups: ['Shoulders'],
    equipment: 'Machine',
  },
  {
    id: 'ex_chest_press_machine',
    name: 'Chest Press Machine',
    muscleGroup: 'Chest',
    secondaryMuscleGroups: ['Shoulders', 'Arms'],
    equipment: 'Machine',
  },
  { id: 'ex_pec_deck', name: 'Pec Deck', muscleGroup: 'Chest', equipment: 'Machine' },
  {
    id: 'ex_dips',
    name: 'Dips',
    muscleGroup: 'Chest',
    secondaryMuscleGroups: ['Arms', 'Shoulders'],
    equipment: 'Bodyweight',
  },
  // Back
  {
    id: 'ex_pull_up',
    name: 'Pull-Up',
    muscleGroup: 'Back',
    secondaryMuscleGroups: ['Arms'],
    equipment: 'Bodyweight',
  },
  {
    id: 'ex_barbell_row',
    name: 'Barbell Row',
    muscleGroup: 'Back',
    secondaryMuscleGroups: ['Arms', 'Core'],
    equipment: 'Barbell / Dumbbell',
  },
  {
    id: 'ex_lat_pulldown',
    name: 'Lat Pulldown',
    muscleGroup: 'Back',
    secondaryMuscleGroups: ['Arms'],
    equipment: 'Machine',
  },
  {
    id: 'ex_seated_row',
    name: 'Seated Cable Row',
    muscleGroup: 'Back',
    secondaryMuscleGroups: ['Arms'],
    equipment: 'Machine',
  },
  {
    id: 'ex_tbar_row',
    name: 'T-Bar Row',
    muscleGroup: 'Back',
    secondaryMuscleGroups: ['Arms', 'Core'],
    equipment: 'Barbell / Dumbbell',
  },
  {
    id: 'ex_assisted_pullup',
    name: 'Assisted Pull-Up Machine',
    muscleGroup: 'Back',
    secondaryMuscleGroups: ['Arms'],
    equipment: 'Machine',
  },
  // Shoulders
  {
    id: 'ex_ohp',
    name: 'Overhead Press',
    muscleGroup: 'Shoulders',
    secondaryMuscleGroups: ['Arms', 'Core'],
    equipment: 'Barbell / Dumbbell',
  },
  {
    id: 'ex_lateral_raise',
    name: 'Lateral Raise',
    muscleGroup: 'Shoulders',
    equipment: 'Barbell / Dumbbell',
  },
  {
    id: 'ex_face_pull',
    name: 'Face Pull',
    muscleGroup: 'Shoulders',
    secondaryMuscleGroups: ['Back'],
    equipment: 'Machine',
  },
  {
    id: 'ex_shoulder_press_machine',
    name: 'Shoulder Press Machine',
    muscleGroup: 'Shoulders',
    secondaryMuscleGroups: ['Arms'],
    equipment: 'Machine',
  },
  {
    id: 'ex_rear_delt_fly',
    name: 'Rear Delt Fly',
    muscleGroup: 'Shoulders',
    equipment: 'Barbell / Dumbbell',
  },
  // Arms
  {
    id: 'ex_bicep_curl',
    name: 'Bicep Curl',
    muscleGroup: 'Arms',
    equipment: 'Barbell / Dumbbell',
  },
  {
    id: 'ex_tricep_pushdown',
    name: 'Tricep Pushdown',
    muscleGroup: 'Arms',
    equipment: 'Machine',
  },
  {
    id: 'ex_hammer_curl',
    name: 'Hammer Curl',
    muscleGroup: 'Arms',
    equipment: 'Barbell / Dumbbell',
  },
  {
    id: 'ex_skull_crusher',
    name: 'Skull Crusher',
    muscleGroup: 'Arms',
    equipment: 'Barbell / Dumbbell',
  },
  {
    id: 'ex_preacher_curl',
    name: 'Preacher Curl',
    muscleGroup: 'Arms',
    equipment: 'Barbell / Dumbbell',
  },
  {
    id: 'ex_overhead_tricep_ext',
    name: 'Overhead Tricep Extension',
    muscleGroup: 'Arms',
    equipment: 'Barbell / Dumbbell',
  },
  // Legs
  {
    id: 'ex_squat',
    name: 'Back Squat',
    muscleGroup: 'Legs',
    secondaryMuscleGroups: ['Core'],
    equipment: 'Barbell / Dumbbell',
  },
  {
    id: 'ex_rdl',
    name: 'Romanian Deadlift',
    muscleGroup: 'Legs',
    secondaryMuscleGroups: ['Back', 'Core'],
    equipment: 'Barbell / Dumbbell',
  },
  { id: 'ex_leg_press', name: 'Leg Press', muscleGroup: 'Legs', equipment: 'Machine' },
  {
    id: 'ex_lunge',
    name: 'Walking Lunge',
    muscleGroup: 'Legs',
    secondaryMuscleGroups: ['Core'],
    equipment: 'Bodyweight',
  },
  { id: 'ex_leg_curl', name: 'Lying Leg Curl', muscleGroup: 'Legs', equipment: 'Machine' },
  {
    id: 'ex_leg_extension',
    name: 'Leg Extension',
    muscleGroup: 'Legs',
    equipment: 'Machine',
  },
  {
    id: 'ex_hack_squat',
    name: 'Hack Squat',
    muscleGroup: 'Legs',
    secondaryMuscleGroups: ['Core'],
    equipment: 'Machine',
  },
  {
    id: 'ex_bulgarian_split',
    name: 'Bulgarian Split Squat',
    muscleGroup: 'Legs',
    secondaryMuscleGroups: ['Core'],
    equipment: 'Bodyweight',
  },
  { id: 'ex_calf_raise', name: 'Calf Raise', muscleGroup: 'Legs', equipment: 'Bodyweight' },
  // Core
  {
    id: 'ex_plank',
    name: 'Plank',
    muscleGroup: 'Core',
    secondaryMuscleGroups: ['Shoulders'],
    equipment: 'Bodyweight',
  },
  {
    id: 'ex_hanging_leg_raise',
    name: 'Hanging Leg Raise',
    muscleGroup: 'Core',
    secondaryMuscleGroups: ['Arms'],
    equipment: 'Bodyweight',
  },
  { id: 'ex_cable_crunch', name: 'Cable Crunch', muscleGroup: 'Core', equipment: 'Machine' },
  {
    id: 'ex_ab_wheel',
    name: 'Ab Wheel Rollout',
    muscleGroup: 'Core',
    secondaryMuscleGroups: ['Shoulders'],
    equipment: 'Bodyweight',
  },
  { id: 'ex_dead_bug', name: 'Dead Bug', muscleGroup: 'Core', equipment: 'Bodyweight' },
  // Full body + cardio
  {
    id: 'ex_deadlift',
    name: 'Conventional Deadlift',
    muscleGroup: 'Full Body',
    secondaryMuscleGroups: ['Back', 'Legs', 'Core'],
    equipment: 'Barbell / Dumbbell',
  },
  {
    id: 'ex_kettlebell_swing',
    name: 'Kettlebell Swing',
    muscleGroup: 'Full Body',
    secondaryMuscleGroups: ['Legs', 'Core', 'Shoulders'],
    equipment: 'Barbell / Dumbbell',
  },
  {
    id: 'ex_treadmill',
    name: 'Treadmill',
    muscleGroup: 'Cardio',
    secondaryMuscleGroups: ['Legs'],
    equipment: 'Machine',
  },
  {
    id: 'ex_bike',
    name: 'Stationary Bike',
    muscleGroup: 'Cardio',
    secondaryMuscleGroups: ['Legs'],
    equipment: 'Machine',
  },
  {
    id: 'ex_rower',
    name: 'Rowing Machine',
    muscleGroup: 'Cardio',
    secondaryMuscleGroups: ['Back', 'Legs', 'Arms'],
    equipment: 'Machine',
  },
];

export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Core',
  'Cardio',
  'Full Body',
] as const;

export const EQUIPMENT_TYPES: Equipment[] = [
  'Machine',
  'Barbell / Dumbbell',
  'Bodyweight',
];

/** Muscle groups that can be trained incidentally (not category buckets). */
export const SECONDARY_MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Core',
];

const SECONDARY_ALLOWED = new Set<MuscleGroup>(SECONDARY_MUSCLE_GROUPS);

export function normalizeSecondaryMuscleGroups(
  primary: MuscleGroup,
  secondary?: MuscleGroup[] | null
): MuscleGroup[] {
  if (!secondary?.length) return [];
  const seen = new Set<MuscleGroup>();
  const out: MuscleGroup[] = [];
  for (const group of secondary) {
    if (!group || group === primary || !SECONDARY_ALLOWED.has(group) || seen.has(group)) {
      continue;
    }
    seen.add(group);
    out.push(group);
  }
  return out;
}

export function getSecondaryMuscleGroups(
  exercise: Pick<Exercise, 'muscleGroup' | 'secondaryMuscleGroups'>
): MuscleGroup[] {
  return normalizeSecondaryMuscleGroups(
    exercise.muscleGroup,
    exercise.secondaryMuscleGroups
  );
}

export function normalizeEquipment(equipment?: Equipment | null): Equipment {
  if (equipment && EQUIPMENT_TYPES.includes(equipment)) return equipment;
  return 'Barbell / Dumbbell';
}

export function normalizeExercise(exercise: Exercise): Exercise {
  return {
    ...exercise,
    equipment: normalizeEquipment(exercise.equipment),
    secondaryMuscleGroups: normalizeSecondaryMuscleGroups(
      exercise.muscleGroup,
      exercise.secondaryMuscleGroups
    ),
  };
}

export type ExerciseListRow =
  | { key: string; type: 'header'; title: string }
  | { key: string; type: 'item'; exercise: Exercise };

export function exerciseListRows(
  exercises: Exercise[],
  groupByEquipment: boolean
): ExerciseListRow[] {
  if (!groupByEquipment) {
    return exercises.map((exercise) => ({
      key: exercise.id,
      type: 'item' as const,
      exercise,
    }));
  }

  const rows: ExerciseListRow[] = [];
  for (const equipment of EQUIPMENT_TYPES) {
    const items = exercises.filter(
      (exercise) => normalizeEquipment(exercise.equipment) === equipment
    );
    if (items.length === 0) continue;
    rows.push({ key: `header-${equipment}`, type: 'header', title: equipment });
    for (const exercise of items) {
      rows.push({ key: exercise.id, type: 'item', exercise });
    }
  }
  return rows;
}

/** Merge stored library with built-ins so new default metadata (e.g. secondaries) applies. */
export function mergeExerciseLibrary(stored: Exercise[]): Exercise[] {
  const byId = new Map(stored.map((e) => [e.id, normalizeExercise(e)]));
  for (const def of DEFAULT_EXERCISES) {
    const existing = byId.get(def.id);
    if (!existing) {
      byId.set(def.id, normalizeExercise(def));
      continue;
    }
    if (existing.isCustom) continue;
    byId.set(
      def.id,
      normalizeExercise({
        ...existing,
        name: def.name,
        muscleGroup: def.muscleGroup,
        secondaryMuscleGroups: def.secondaryMuscleGroups,
        equipment: def.equipment,
      })
    );
  }
  return [...byId.values()];
}
