// Registers this phone for server-sent nudges (Supabase cron -> Expo push), so nudges still arrive when the app has not been
// opened for days. Needs: signed in, notification permission, and Firebase set up for the build (docs/BUILD_AND_PUSH_STEPS.md).
// If any of that is missing this returns false and the app keeps using notifications scheduled on the phone.
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

export async function registerPush(userId: string | undefined): Promise<boolean> {
  if (Platform.OS === 'web' || !supabase || !userId) return false;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return false;
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    if (!projectId) return false;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const now = new Date().toISOString();
    const { error } = await supabase.from('push_devices').upsert(
      { user_id: userId, token, platform: Platform.OS, last_open_at: now, sent_since_open: 0, updated_at: now },
      { onConflict: 'user_id,token' },
    );
    return !error;
  } catch {
    return false; // no Firebase config, offline, or token service unavailable
  }
}

/** Tell the server the app was opened (resets the "ignored nudges" counter). */
export async function touchPush(userId: string | undefined): Promise<void> {
  if (!supabase || !userId) return;
  const now = new Date().toISOString();
  await supabase.from('push_devices').update({ last_open_at: now, sent_since_open: 0, updated_at: now }).eq('user_id', userId);
}
