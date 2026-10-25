import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// EXPO_PUBLIC_LOCAL_ONLY=1 forces local-only mode (used for emulator test builds that must not touch the cloud).
const localOnly = process.env.EXPO_PUBLIC_LOCAL_ONLY === '1';
const url = localOnly ? undefined : process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = localOnly ? undefined : process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Null when the app has not been configured with a backend yet (local-only mode). */
export const supabase: SupabaseClient | null =
  url && anon
    ? createClient(url, anon, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === 'web',
        },
      })
    : null;

export const cloudEnabled = !!supabase;
