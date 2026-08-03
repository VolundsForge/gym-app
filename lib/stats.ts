import type { Workout, WorkoutStats } from '@/types/workout';

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // Monday-based week
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

export function computeStats(workouts: Workout[]): WorkoutStats {
  const finished = workouts.filter((w) => w.finishedAt);
  const weekStart = startOfWeek(new Date()).getTime();

  const workoutsThisWeek = finished.filter((w) => {
    const t = new Date(w.finishedAt ?? w.startedAt).getTime();
    return t >= weekStart;
  }).length;

  const totalSets = finished.reduce(
    (sum, w) =>
      sum +
      w.exercises.reduce(
        (exSum, ex) => exSum + ex.sets.filter((s) => s.completed).length,
        0
      ),
    0
  );

  const sorted = [...finished].sort(
    (a, b) =>
      new Date(b.finishedAt ?? b.startedAt).getTime() -
      new Date(a.finishedAt ?? a.startedAt).getTime()
  );

  return {
    totalWorkouts: finished.length,
    workoutsThisWeek,
    totalSets,
    lastWorkoutAt: sorted[0]?.finishedAt ?? sorted[0]?.startedAt,
  };
}

export function formatDuration(startedAt: string, finishedAt?: string): string {
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const mins = Math.max(0, Math.round((end - start) / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function workoutVolume(workout: Workout): number {
  return workout.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets
        .filter((s) => s.completed)
        .reduce((sSum, s) => sSum + s.reps * s.weight, 0),
    0
  );
}
