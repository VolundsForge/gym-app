/** Phone notifications are skipped in the web testing window. */

export async function requestTimerPermissions(): Promise<boolean> {
  return false;
}

export async function showWorkoutTimerNotification(
  _workoutName: string,
  _elapsed: string
): Promise<void> {}

export async function hideWorkoutTimerNotification(): Promise<void> {}
