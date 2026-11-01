/** Phone notifications are skipped in the web testing window. */

export const IDLE_REMINDER_SECONDS = 20 * 60;

export async function requestTimerPermissions(): Promise<boolean> {
  return false;
}

export async function showWorkoutTimerNotification(
  _workoutName: string,
  _elapsed: string
): Promise<void> {}

export async function hideWorkoutTimerNotification(): Promise<void> {}

export async function scheduleIdleWorkoutReminder(
  _workoutName: string
): Promise<void> {}

export async function cancelIdleWorkoutReminder(): Promise<void> {}

export function subscribeIdleReminderTap(_onTap: () => void): () => void {
  return () => {};
}
