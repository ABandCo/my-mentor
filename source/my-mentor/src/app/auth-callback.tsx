// Opened by the link in Supabase's confirmation / password-reset emails (mymentor://auth-callback#…).
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MentorOrb } from '@/components/mentor-orb';
import { Button, T } from '@/components/ui';
import { parseAuthUrl } from '@/lib/auth-links';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { colors, space } from '@/theme/tokens';

export default function AuthCallback() {
  const url = Linking.useURL();
  const { session } = useStore();
  const handled = useRef<string | null>(null);
  const [problem, setProblem] = useState<string>();

  useEffect(() => {
    if (!url || handled.current === url) return;
    handled.current = url;
    const link = parseAuthUrl(url);

    (async () => {
      if (link.error) return setProblem(link.error);
      if (!supabase) return setProblem('Sign-in is not available in this build.');
      try {
        if (link.accessToken && link.refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
          if (error) return setProblem('This link could not sign you in. Go back and request a new one.');
          router.replace(link.type === 'recovery' ? '/reset-password' : '/');
        } else if (link.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(link.code);
          if (error) return setProblem('This link has expired or was already used. Go back and request a new one.');
          router.replace('/');
        }
      } catch {
        setProblem('No internet connection. Check it and tap the link again.');
      }
    })();
  }, [url]);

  // Opened without a usable link (for example the app was already signed in): just go home.
  useEffect(() => {
    if (problem || url) return;
    const t = setTimeout(() => router.replace(session ? '/' : '/sign-in'), 2500);
    return () => clearTimeout(t);
  }, [url, session, problem]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.wrap}>
        <MentorOrb size={110} state={problem ? 'firm' : 'thinking'} />
        {problem ? (
          <>
            <T variant="h2" style={{ textAlign: 'center' }}>
              That link didn't work
            </T>
            <T variant="body" style={{ textAlign: 'center', color: colors.muted }}>
              {problem}
            </T>
            <Button label="Back to sign in" onPress={() => router.replace('/sign-in')} />
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} />
            <T variant="body" style={{ textAlign: 'center', color: colors.muted }}>
              Signing you in…
            </T>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space(2.5), padding: space(3) },
});
