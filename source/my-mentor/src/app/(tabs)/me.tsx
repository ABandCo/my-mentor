import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationCard } from '@/components/notification-card';
import { Button, Card, T } from '@/components/ui';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius, space } from '@/theme/tokens';

const STATUS_TEXT = {
  'local-only': { t: 'Stored on this phone only', c: colors.muted },
  'signed-out': { t: 'Signed out', c: colors.muted },
  syncing: { t: 'Syncing…', c: colors.accentText },
  synced: { t: '✓ Backed up to your private cloud', c: colors.primaryText },
  offline: { t: 'Offline. Changes will sync when you are back online.', c: colors.accentText },
  error: { t: 'Sync problem', c: colors.firmText },
} as const;

function confirm(title: string, body: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${body}`));
  return new Promise((res) =>
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel', onPress: () => res(false) },
      { text: 'Delete everything', style: 'destructive', onPress: () => res(true) },
    ]),
  );
}

export default function Me() {
  const { state, dispatch, session, sync, syncNow, signOut, resetLocal } = useStore();
  const [name, setName] = useState(state.name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();
  const st = STATUS_TEXT[sync.status];

  const exportData = async () => {
    const { outbox, hydrated, ...data } = state;
    const json = JSON.stringify({ exportedAt: new Date().toISOString(), account: session?.user.email ?? null, ...data }, null, 2);
    if (Platform.OS === 'web') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = `my-mentor-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } else {
      await Share.share({ title: 'My Mentor export', message: json });
    }
  };

  const deleteAll = async () => {
    const ok = await confirm('Delete all my data?', 'This permanently deletes your account and everything in it, on this phone and in the cloud. It cannot be undone.');
    if (!ok) return;
    setBusy(true);
    if (supabase && session) {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) {
        setBusy(false);
        return setMsg(`Could not delete from the cloud: ${error.message}. Nothing was removed.`);
      }
      await supabase.auth.signOut();
    }
    resetLocal();
    setBusy(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <T variant="h1" hi="मैं">
          Me
        </T>

        <Card style={{ gap: space(1.5) }}>
          <T variant="title">Your name</T>
          <TextInput value={name} onChangeText={setName} placeholder="What should the mentor call you?" placeholderTextColor={colors.muted} style={styles.input} />
          <Button label="Save" kind="soft" disabled={!name.trim() || name === state.name} onPress={() => dispatch({ type: 'setName', name: name.trim() })} />
        </Card>

        <NotificationCard />

        <Card style={{ gap: space(1) }}>
          <T variant="title">Account and backup</T>
          {session ? <T variant="body">{session.user.email}</T> : null}
          <T variant="body" style={{ color: st.c }}>
            {st.t}
          </T>
          {sync.error ? <T variant="caption">{sync.error}</T> : null}
          {sync.pending ? <T variant="caption">{sync.pending} change(s) waiting to upload</T> : null}
          {!session ? (
            <>
              <T variant="body" style={{ color: colors.muted }}>
                You are using My Mentor without an account. Everything is saved on this device. Sign in to turn on the Krishna AI mentor, cloud backup and Couple Space.
              </T>
              <Button label="Sign in or create an account" onPress={() => router.push('/sign-in')} />
            </>
          ) : null}
          {session ? (
            <View style={{ flexDirection: 'row', gap: space(1), marginTop: space(1) }}>
              <Button compact kind="soft" label="Sync now" onPress={syncNow} style={{ flex: 1 }} />
              <Button compact kind="ghost" label="Sign out" onPress={signOut} style={{ flex: 1 }} />
            </View>
          ) : null}
        </Card>

        <Card tone="sand" style={{ gap: space(1.5) }}>
          <T variant="title">Privacy</T>
          <T variant="body" style={{ color: colors.muted }}>
            Only you can read your data. The database itself enforces this, not just the app. AI use: {state.profile.aiConsentGeneral ? 'allowed' : 'off'}; sensitive
            entries to AI: {state.profile.aiConsentSensitive ? 'allowed' : 'off'}.
          </T>
          <Button kind="soft" label="Export my data" onPress={exportData} />
          <Button kind="firm" label="Delete all my data" loading={busy} onPress={deleteAll} />
          {msg ? (
            <T variant="body" style={{ color: colors.firmText }}>
              {msg}
            </T>
          ) : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space(2.5), paddingBottom: 140, gap: space(2.5), maxWidth: 640, width: '100%', alignSelf: 'center' },
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
