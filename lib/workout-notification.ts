import { Platform } from 'react-native';

/** Shade notifications run on a real iOS/Android device, not the web test window. */
function onPhone() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

const TIMER_ID = 'gym-workout-timer';
const CHANNEL_ID = 'workout-timer';

let channelReady = false;
let handlerReady = false;

async function notifications() {
  return import('expo-notifications');
}

async function ensureHandler() {
  if (handlerReady) return;
  const Notifications = await notifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
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

async function ensureChannel() {
  if (channelReady || Platform.OS !== 'android') return;
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
    channelReady = true;
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
    await ensureChannel();
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
