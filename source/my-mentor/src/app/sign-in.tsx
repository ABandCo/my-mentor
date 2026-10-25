import { Redirect, router } from 'expo-router';
import { openUrl, PRIVACY_URL } from '@/lib/links';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MentorOrb } from '@/components/mentor-orb';
import { Button, Card, T } from '@/components/ui';
import { AUTH_REDIRECT } from '@/lib/auth-links';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius, space } from '@/theme/tokens';

// Email links return to the app on Android/iOS. On the web preview Supabase's default site address is used instead.
const redirectTo = Platform.OS === 'web' ? undefined : AUTH_REDIRECT;

function friendly(msg: string) {
  if (/invalid login/i.test(msg)) return 'That email and password do not match. Check both, or tap "Forgot password?".';
  if (/not confirmed/i.test(msg)) return 'This email is not confirmed yet. Open the confirmation email and tap its link, or resend it below.';
  if (/already registered/i.test(msg)) return 'An account with this email already exists. Switch to "Sign in".';
  if (/rate limit|too many|seconds/i.test(msg)) return 'Too many tries. Wait a minute, then try again.';
  if (/password/i.test(msg)) return 'Use at least 8 characters for the password.';
  if (/fetch|network/i.test(msg)) return 'No internet connection. Your data on this phone is safe; try again when online.';
  return msg;
}

export default function SignIn() {
  const { session } = useStore();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string; resend?: boolean }>();

  // Signed in (by password or by an email link): leave this screen. This was missing in 1.0.0–1.0.3.
  if (session) return <Redirect href="/" />;

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const valid = emailOk && password.length >= 8;

  const submit = async () => {
    if (!supabase || !valid || busy) return;
    setBusy(true);
    setMsg(undefined);
    const res =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirectTo } });
    setBusy(false);
    if (res.error) return setMsg({ kind: 'error', text: friendly(res.error.message), resend: /not confirmed/i.test(res.error.message) });
    if (mode === 'up' && !res.data.session) {
      setMsg({
        kind: 'info',
        text: 'Account created. Open the confirmation email on this phone and tap its link. It opens My Mentor and signs you in. (If a page says "localhost refused to connect", your email IS confirmed; just come back here and sign in.)',
      });
    }
    // On success the session arrives and the redirect above takes you to the app.
  };

  const resend = async () => {
    if (!supabase || !emailOk) return setMsg({ kind: 'error', text: 'Type your email address first.' });
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirectTo } });
    setBusy(false);
    setMsg(error ? { kind: 'error', text: friendly(error.message) } : { kind: 'info', text: 'Sent. Check your inbox (and spam) for a fresh confirmation email.' });
  };

  const forgot = async () => {
    if (!supabase) return;
    if (!emailOk) return setMsg({ kind: 'error', text: 'Type your email address above first, then tap "Forgot password?".' });
    setBusy(true);
    setMsg(undefined);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setBusy(false);
    setMsg(
      error
        ? { kind: 'error', text: friendly(error.message) }
        : { kind: 'info', text: 'If that email has an account, a reset link is on its way. Open it on this phone; it opens My Mentor so you can choose a new password.' },
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', gap: space(1) }}>
            <MentorOrb size={130} state={busy ? 'thinking' : 'idle'} />
            <T variant="hero" style={{ textAlign: 'center' }}>
              My Mentor
            </T>
            <T variant="hindi">मेरा मेंटर</T>
            <T variant="body" style={{ textAlign: 'center', color: colors.muted }}>
              Your private space. Only you can see your data.
            </T>
          </Animated.View>

          <Card style={{ gap: space(1.5) }}>
            <View style={styles.seg}>
              {(['in', 'up'] as const).map((m) => (
                <Button
                  key={m}
                  compact
                  label={m === 'in' ? 'Sign in' : 'New account'}
                  kind={mode === m ? 'primary' : 'ghost'}
                  style={{ flex: 1 }}
                  onPress={() => {
                    setMode(m);
                    setMsg(undefined);
                  }}
                />
              ))}
            </View>
            <T variant="label">Email</T>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              style={styles.input}
              accessibilityLabel="Email"
            />
            <T variant="label">Password</T>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.muted}
              style={styles.input}
              accessibilityLabel="Password"
              onSubmitEditing={submit}
            />
            {msg ? (
              <T variant="body" style={{ color: msg.kind === 'error' ? colors.firmText : colors.primaryText }}>
                {msg.text}
              </T>
            ) : null}
            {msg?.resend ? <Button compact kind="soft" label="Resend confirmation email" onPress={resend} /> : null}
            <Button label={mode === 'in' ? 'Sign in' : 'Create my account'} disabled={!valid} loading={busy} onPress={submit} />
            {mode === 'in' ? (
              <Pressable onPress={forgot} accessibilityRole="button" accessibilityLabel="Forgot password" style={styles.link}>
                <Text style={styles.linkText}>Forgot password?</Text>
              </Pressable>
            ) : null}
          </Card>
          <Button kind="ghost" label="Not now, use without an account" onPress={() => router.replace('/')} />
          <Pressable onPress={() => openUrl(PRIVACY_URL)} accessibilityRole="link" accessibilityLabel="Privacy policy" style={styles.link}>
            <Text style={styles.linkText}>Privacy policy</Text>
          </Pressable>
          <T variant="caption" style={{ textAlign: 'center' }}>
            An account is optional. It turns on the Krishna AI mentor, cloud backup and Couple Space. Without one, everything else works and stays on this device.
          </T>
          <T variant="caption" style={{ textAlign: 'center' }}>
            Each person has a separate account. Nothing is shared between accounts unless both of you agree in Couple Space.
          </T>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space(3), gap: space(3), flexGrow: 1, justifyContent: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' },
  seg: { flexDirection: 'row', gap: space(1), marginBottom: space(1) },
  link: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.primaryText, textDecorationLine: 'underline' },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    paddingHorizontal: space(2),
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
});
