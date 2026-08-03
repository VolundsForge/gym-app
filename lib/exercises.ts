import type { Exercise } from '@/types/workout';

/** Built-in exercise library shown on first launch. */
export const DEFAULT_EXERCISES: Exercise[] = [
  // Chest
  { id: 'ex_bench_press', name: 'Bench Press', muscleGroup: 'Chest' },
  { id: 'ex_incline_db_press', name: 'Incline Dumbbell Press', muscleGroup: 'Chest' },
  { id: 'ex_push_up', name: 'Push-Up', muscleGroup: 'Chest' },
  { id: 'ex_cable_fly', name: 'Cable Fly', muscleGroup: 'Chest' },
  { id: 'ex_chest_press_machine', name: 'Chest Press Machine', muscleGroup: 'Chest' },
  { id: 'ex_pec_deck', name: 'Pec Deck', muscleGroup: 'Chest' },
  { id: 'ex_dips', name: 'Dips', muscleGroup: 'Chest' },
  // Back
  { id: 'ex_pull_up', name: 'Pull-Up', muscleGroup: 'Back' },
  { id: 'ex_barbell_row', name: 'Barbell Row', muscleGroup: 'Back' },
  { id: 'ex_lat_pulldown', name: 'Lat Pulldown', muscleGroup: 'Back' },
  { id: 'ex_seated_row', name: 'Seated Cable Row', muscleGroup: 'Back' },
  { id: 'ex_tbar_row', name: 'T-Bar Row', muscleGroup: 'Back' },
  { id: 'ex_assisted_pullup', name: 'Assisted Pull-Up Machine', muscleGroup: 'Back' },
  // Shoulders
  { id: 'ex_ohp', name: 'Overhead Press', muscleGroup: 'Shoulders' },
  { id: 'ex_lateral_raise', name: 'Lateral Raise', muscleGroup: 'Shoulders' },
  { id: 'ex_face_pull', name: 'Face Pull', muscleGroup: 'Shoulders' },
  { id: 'ex_shoulder_press_machine', name: 'Shoulder Press Machine', muscleGroup: 'Shoulders' },
  { id: 'ex_rear_delt_fly', name: 'Rear Delt Fly', muscleGroup: 'Shoulders' },
  // Arms
  { id: 'ex_bicep_curl', name: 'Bicep Curl', muscleGroup: 'Arms' },
  { id: 'ex_tricep_pushdown', name: 'Tricep Pushdown', muscleGroup: 'Arms' },
  { id: 'ex_hammer_curl', name: 'Hammer Curl', muscleGroup: 'Arms' },
  { id: 'ex_skull_crusher', name: 'Skull Crusher', muscleGroup: 'Arms' },
  { id: 'ex_preacher_curl', name: 'Preacher Curl', muscleGroup: 'Arms' },
  { id: 'ex_overhead_tricep_ext', name: 'Overhead Tricep Extension', muscleGroup: 'Arms' },
  // Legs
  { id: 'ex_squat', name: 'Back Squat', muscleGroup: 'Legs' },
  { id: 'ex_rdl', name: 'Romanian Deadlift', muscleGroup: 'Legs' },
  { id: 'ex_leg_press', name: 'Leg Press', muscleGroup: 'Legs' },
  { id: 'ex_lunge', name: 'Walking Lunge', muscleGroup: 'Legs' },
  { id: 'ex_leg_curl', name: 'Lying Leg Curl', muscleGroup: 'Legs' },
  { id: 'ex_leg_extension', name: 'Leg Extension', muscleGroup: 'Legs' },
  { id: 'ex_hack_squat', name: 'Hack Squat', muscleGroup: 'Legs' },
  { id: 'ex_bulgarian_split', name: 'Bulgarian Split Squat', muscleGroup: 'Legs' },
  { id: 'ex_calf_raise', name: 'Calf Raise', muscleGroup: 'Legs' },
  // Core
  { id: 'ex_plank', name: 'Plank', muscleGroup: 'Core' },
  { id: 'ex_hanging_leg_raise', name: 'Hanging Leg Raise', muscleGroup: 'Core' },
  { id: 'ex_cable_crunch', name: 'Cable Crunch', muscleGroup: 'Core' },
  { id: 'ex_ab_wheel', name: 'Ab Wheel Rollout', muscleGroup: 'Core' },
  { id: 'ex_dead_bug', name: 'Dead Bug', muscleGroup: 'Core' },
  // Full body + cardio
  { id: 'ex_deadlift', name: 'Conventional Deadlift', muscleGroup: 'Full Body' },
  { id: 'ex_kettlebell_swing', name: 'Kettlebell Swing', muscleGroup: 'Full Body' },
  { id: 'ex_treadmill', name: 'Treadmill', muscleGroup: 'Cardio' },
  { id: 'ex_bike', name: 'Stationary Bike', muscleGroup: 'Cardio' },
  { id: 'ex_rower', name: 'Rowing Machine', muscleGroup: 'Cardio' },
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
