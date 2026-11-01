import { Platform } from 'react-native';

/** Shade notifications run on a real iOS/Android device, not the web test window. */
function onPhone() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

const TIMER_ID = 'gym-workout-timer';
const CHANNEL_ID = 'workout-timer';
const IDLE_ID = 'gym-workout-idle';
const IDLE_CHANNEL_ID = 'workout-idle';

/** Remind after this long with a live session and the app unused. */
export const IDLE_REMINDER_SECONDS = 20 * 60;

let timerChannelReady = false;
let idleChannelReady = false;
let handlerReady = false;

async function notifications() {
  return import('expo-notifications');
}

async function ensureHandler() {
  if (handlerReady) return;
  const Notifications = await notifications();
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const idle = notification.request.identifier === IDLE_ID;
      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: idle,
        shouldSetBadge: false,
      };
    },
  });
  handlerReady = true;
}

export async function requestTimerPermissions(): Promise<boolean> {
  if (!onPhone()) return false;
  try {
    const Notifications = await notifications();
    const current = await Notifications.getPermissionsAsync();
    const status =
      current.status === 'granted'
        ? current
        : await Notifications.requestPermissionsAsync();
    return status.status === 'granted';
  } catch {
    return false;
  }
}

async function ensureTimerChannel() {
  if (timerChannelReady || Platform.OS !== 'android') return;
  try {
    const Notifications = await notifications();
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Workout timer',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0],
      enableVibrate: false,
      sound: null,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    timerChannelReady = true;
  } catch {
    // Channel setup can fail on web-like environments.
  }
}

async function ensureIdleChannel() {
  if (idleChannelReady || Platform.OS !== 'android') return;
  try {
    const Notifications = await notifications();
    await Notifications.setNotificationChannelAsync(IDLE_CHANNEL_ID, {
      name: 'Workout reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 80, 180],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    idleChannelReady = true;
  } catch {
    // Channel setup can fail on web-like environments.
  }
}

export async function showWorkoutTimerNotification(
  workoutName: string,
  elapsed: string
): Promise<void> {
  if (!onPhone()) return;
  try {
    await ensureHandler();
    const ok = await requestTimerPermissions();
    if (!ok) return;
    await ensureTimerChannel();
    const Notifications = await notifications();
    await Notifications.scheduleNotificationAsync({
      identifier: TIMER_ID,
      content: {
        title: workoutName,
        body: `Elapsed ${elapsed}`,
        sound: false,
        sticky: true,
        autoDismiss: false,
        priority: Notifications.AndroidNotificationPriority.LOW,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: null,
    });
  } catch {
    // Notifications are unavailable in Expo Go on some platforms.
  }
}

export async function hideWorkoutTimerNotification(): Promise<void> {
  if (!onPhone()) return;
  try {
    const Notifications = await notifications();
    await Notifications.dismissNotificationAsync(TIMER_ID);
  } catch {
    // Ignore if nothing was presented.
  }
}

function idleReminderTitle(workoutName: string): string {
  const name = workoutName.trim();
  return name ? `${name} is still running` : 'Workout still running';
}

/** Schedule (or reset) the 20-minute idle reminder for a live session. */
export async function scheduleIdleWorkoutReminder(
  workoutName: string
): Promise<void> {
  if (!onPhone()) return;
  try {
    await ensureHandler();
    const ok = await requestTimerPermissions();
    if (!ok) return;
    await ensureIdleChannel();
    const Notifications = await notifications();
    await Notifications.cancelScheduledNotificationAsync(IDLE_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: IDLE_ID,
      content: {
        title: idleReminderTitle(workoutName),
        body: 'Finish this workout so it does not keep counting time on your record.',
        sound: true,
        data: { url: '/workout/active' },
        ...(Platform.OS === 'android' ? { channelId: IDLE_CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: IDLE_REMINDER_SECONDS,
        repeats: true,
        ...(Platform.OS === 'android' ? { channelId: IDLE_CHANNEL_ID } : {}),
      },
    });
  } catch {
    // Notifications are unavailable in Expo Go on some platforms.
  }
}

export async function cancelIdleWorkoutReminder(): Promise<void> {
  if (!onPhone()) return;
  try {
    const Notifications = await notifications();
    await Notifications.cancelScheduledNotificationAsync(IDLE_ID);
    await Notifications.dismissNotificationAsync(IDLE_ID);
  } catch {
    // Ignore if nothing was scheduled.
  }
}

/** Open the active workout when the idle reminder is tapped. */
export function subscribeIdleReminderTap(onTap: () => void): () => void {
  if (!onPhone()) return () => {};
  let cancelled = false;
  let sub: { remove: () => void } | undefined;

  void (async () => {
    try {
      const Notifications = await notifications();
      await ensureHandler();
      if (cancelled) return;
      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        if (response.notification.request.identifier === IDLE_ID) {
          onTap();
        }
      });
    } catch {
      // Notifications unavailable.
    }
  })();

  return () => {
    cancelled = true;
    sub?.remove();
  };
}
