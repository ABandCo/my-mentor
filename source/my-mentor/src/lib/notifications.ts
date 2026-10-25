// Accountability notifications, scheduled on the phone itself (works offline, no server needed).
// We schedule one-off notifications for the next DAYS days and reschedule whenever the app opens or
// settings change. If the app isn't opened for DAYS days, nudges stop by themselves (ignored nudges don't help).
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { HOURLY_CATEGORY, NotifSettings, PlanExtras, planNotifications } from './notification-plan';
import type { Profile } from './store';

export { DAYS, HOURLY_CATEGORY, planNotifications } from './notification-plan';
export type { NotifSettings, PlanExtras, Planned } from './notification-plan';

export const CHANNEL = 'checkins';

let channelReady = false;
async function ensureSetup() {
  if (channelReady || Platform.OS === 'web') return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Check-ins and reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#4F7A63',
    });
  }
  await Notifications.setNotificationCategoryAsync(HOURLY_CATEGORY, [
    { identifier: 'done', buttonTitle: '✓ Done', options: { opensAppToForeground: true } },
    { identifier: 'partly', buttonTitle: '◐ Partly', options: { opensAppToForeground: true } },
    { identifier: 'missed', buttonTitle: '✕ Missed', options: { opensAppToForeground: true } },
  ]);
  channelReady = true;
}

export function installForegroundHandler() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export async function permissionStatus(): Promise<'granted' | 'denied' | 'undetermined' | 'unsupported'> {
  if (Platform.OS === 'web') return 'unsupported';
  const r = await Notifications.getPermissionsAsync();
  return r.granted ? 'granted' : r.canAskAgain ? 'undetermined' : 'denied';
}

/** Replace everything scheduled with a fresh plan. Returns how many were scheduled. */
export async function reschedule(p: Profile, s: NotifSettings, x: PlanExtras = {}): Promise<{ count: number; next?: Date; error?: string }> {
  if (Platform.OS === 'web') return { count: 0, error: 'Notifications only work in the Android app.' };
  try {
    if ((await permissionStatus()) !== 'granted') {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return { count: 0, error: 'Notification permission is off.' };
    }
    await ensureSetup();
    await Notifications.cancelAllScheduledNotificationsAsync();
    const plan = planNotifications(p, s, new Date(), x);
    for (const n of plan) {
      await Notifications.scheduleNotificationAsync({
        content: { title: n.title, body: n.body, data: n.data, categoryIdentifier: n.category, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: CHANNEL },
      });
    }
    return { count: plan.length, next: plan[0]?.at };
  } catch (e) {
    return { count: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendTest(seconds = 5) {
  await ensureSetup();
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test check-in ✓',
      body: 'If you can see this, notifications work. Tap a button to try it.',
      data: { kind: 'test' },
      categoryIdentifier: HOURLY_CATEGORY,
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: CHANNEL },
  });
}

/** One immediate local notification (used for the late-wake push). */
export async function notifyNow(title: string, body: string) {
  if (Platform.OS === 'web' || (await permissionStatus()) !== 'granted') return;
  await ensureSetup();
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { kind: 'wake' }, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: CHANNEL },
  });
}
