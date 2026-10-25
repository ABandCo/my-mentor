import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MentorOrb } from '@/components/mentor-orb';
import { Button, Card, T } from '@/components/ui';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius, space } from '@/theme/tokens';

export default function ResetPassword() {
  const { session, authReady } = useStore();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();
  const [done, setDone] = useState(false);

  if (authReady && !session && !done) return <Redirect href="/sign-in" />;

  const mismatch = pw2.length > 0 && pw !== pw2;
  const valid = pw.length >= 8 && pw === pw2;

  const save = async () => {
    if (!supabase || !valid) return;
    setBusy(true);
    setMsg(undefined);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      if (/same|different/i.test(error.message)) return setMsg('Choose a password you have not used before.');
      if (/network|fetch/i.test(error.message)) return setMsg('No internet connection. Try again when online.');
      return setMsg(error.message);
    }
    setDone(true);
    setTimeout(() => router.replace('/'), 1200);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <MentorOrb size={100} state={done ? 'celebrating' : 'idle'} />
          <T variant="h1" style={{ textAlign: 'center' }}>
            Choose a new password
          </T>
          {done ? (
            <Card tone="sage">
              <T variant="title">✓ Password updated. Taking you in…</T>
            </Card>
          ) : (
            <Card style={{ gap: space(1.5) }}>
              <T variant="label">New password</T>
              <TextInput
                value={pw}
                onChangeText={setPw}
                secureTextEntry
                autoComplete="new-password"
                placeholder="At least 8 characters"
                placeholderTextColor={colors.muted}
                style={styles.input}
                accessibilityLabel="New password"
              />
              <T variant="label">Type it again</T>
              <TextInput
                value={pw2}
                onChangeText={setPw2}
                secureTextEntry
                autoComplete="new-password"
                placeholder="Same password"
                placeholderTextColor={colors.muted}
                style={styles.input}
                accessibilityLabel="Confirm new password"
                onSubmitEditing={save}
              />
              {mismatch ? (
                <T variant="body" style={{ color: colors.firmText }}>
                  The two passwords don't match.
                </T>
              ) : null}
              {msg ? (
                <T variant="body" style={{ color: colors.firmText }}>
                  {msg}
                </T>
              ) : null}
              <Button label="Save new password" disabled={!valid} loading={busy} onPress={save} />
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space(3), gap: space(3), flexGrow: 1, justifyContent: 'center', alignItems: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' },
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
    alignSelf: 'stretch',
  },
});
