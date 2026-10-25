import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton, Pill, ProgressBar, Row, ScreenHeader } from '@/components/kit';
import { CalendarCard } from '@/components/calendar-card';
import { DisciplineSettings } from '@/components/discipline-settings';
import { NotificationCard } from '@/components/notification-card';
import { Button, Card, Chip, T } from '@/components/ui';
import { pingMentor, type PingInfo } from '@/lib/ai/client';
import { explain } from '@/lib/ai/explain';
import { DELETE_URL, openUrl, PRIVACY_URL } from '@/lib/links';
import { type CoachingStyle, type Language, useStore } from '@/lib/store';
import { colors, fonts, radius, space } from '@/theme/tokens';

const LANGS: { v: Language; label: string }[] = [
  { v: 'en', label: 'English' },
  { v: 'hi', label: 'हिन्दी' },
  { v: 'hinglish', label: 'Hinglish' },
];
const STYLES: { v: CoachingStyle; label: string }[] = [
  { v: 'strict', label: 'Strict & direct' },
  { v: 'balanced', label: 'Balanced' },
  { v: 'gentle', label: 'Gentle' },
  { v: 'reflective', label: 'Reflective' },
  { v: 'communication', label: 'Communication' },
  { v: 'business', label: 'Business' },
];
const RETENTION = [
  { d: 7, label: '7 days' },
  { d: 30, label: '30 days' },
  { d: 90, label: '90 days' },
  { d: 0, label: 'Keep' },
];

function Toggle({ title, sub, value, onChange, disabled }: { title: string; sub?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={[styles.toggle, disabled && { opacity: 0.45 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        {sub ? <Text style={styles.toggleSub}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} accessibilityLabel={title} trackColor={{ true: colors.primary, false: colors.hairline }} thumbColor="#fff" />
    </View>
  );
}

export default function Settings() {
  const { state, dispatch, session, sync, signOut } = useStore();
  const p = state.profile;
  const [ping, setPing] = useState<{ busy: boolean; info?: PingInfo; error?: string }>({ busy: false });
  const [name, setName] = useState('');

  const testConnection = async () => {
    setPing({ busy: true });
    const r = await pingMentor();
    if (r.ok) setPing({ busy: false, info: r.info });
    else setPing({ busy: false, error: explain(r.code, p.language) });
  };
  const addName = () => {
    const n = name.trim();
    if (n.length < 2 || state.prefs.maskNames.some((x) => x.toLowerCase() === n.toLowerCase())) return;
    dispatch({ type: 'setPrefs', prefs: { maskNames: [...state.prefs.maskNames, n] } });
    setName('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Settings" hi="सेटिंग्स" left={<IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />} />

        {/* Krishna and AI */}
        <Card style={{ gap: space(1.5) }}>
          <T variant="h2">Krishna and AI</T>
          <Toggle
            title="Let Krishna think with AI"
            sub="Uses Google's free Gemini. Free-tier text may be used by Google to improve its products, so private details are masked first."
            value={p.aiConsentGeneral}
            onChange={(v) => dispatch({ type: 'setProfile', profile: { aiConsentGeneral: v, aiConsentSensitive: v ? p.aiConsentSensitive : false } })}
          />
          <Toggle
            title="Also allow health, family and journal"
            sub="Highly personal. Off unless you choose. You can also mark single memories private."
            value={p.aiConsentSensitive}
            disabled={!p.aiConsentGeneral}
            onChange={(v) => dispatch({ type: 'setProfile', profile: { aiConsentSensitive: v } })}
          />

          <T variant="label">Language</T>
          <View style={styles.wrap}>
            {LANGS.map((l) => (
              <Chip key={l.v} label={l.label} selected={p.language === l.v} onPress={() => dispatch({ type: 'setProfile', profile: { language: l.v } })} />
            ))}
          </View>
          <T variant="label">Coaching style</T>
          <View style={styles.wrap}>
            {STYLES.map((s) => (
              <Chip key={s.v} label={s.label} selected={p.coachingStyle === s.v} onPress={() => dispatch({ type: 'setProfile', profile: { coachingStyle: s.v } })} />
            ))}
          </View>

          <T variant="label">Free AI allowance</T>
          {ping.info ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ProgressBar value={ping.info.cap ? ping.info.used / ping.info.cap : 0} color={ping.info.used / Math.max(1, ping.info.cap) > 0.8 ? colors.attention : colors.primary} height={10} />
                <Text style={styles.toggleSub}>
                  {ping.info.used} / {ping.info.cap} today
                </Text>
              </View>
              <View style={styles.wrap}>
                <Pill label={ping.info.configured ? 'AI key connected' : 'AI key not set up yet'} tone={ping.info.configured ? 'sage' : 'gold'} icon={ping.info.configured ? 'checkmark-circle' : 'alert-circle'} />
                <Pill label={ping.info.consent.general ? 'Consent on (server)' : 'Consent off (server)'} tone={ping.info.consent.general ? 'sage' : 'sand'} />
              </View>
            </View>
          ) : null}
          {ping.error ? <T variant="body" style={{ color: colors.firmText }}>{ping.error}</T> : null}
          <Button compact kind="soft" label="Check AI connection and allowance" loading={ping.busy} onPress={testConnection} />
          <T variant="caption">The daily cap keeps us inside Google's free limit. When it runs out, check-ins, habits and plans keep working and Krishna coaches from your records.</T>
        </Card>

        {/* Names */}
        <Card style={{ gap: space(1.25) }}>
          <T variant="h2">Names to keep private</T>
          <T variant="body" style={{ color: colors.muted }}>
            Client or family names you add here are replaced with “Client A”, “Client B”… before anything is sent to AI, and put back on your screen. PAN, GSTIN, phone, email and account numbers are always masked.
          </T>
          <View style={styles.wrap}>
            {state.prefs.maskNames.map((n) => (
              <Chip key={n} label={`${n}  ✕`} onPress={() => dispatch({ type: 'setPrefs', prefs: { maskNames: state.prefs.maskNames.filter((x) => x !== n) } })} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={name} onChangeText={setName} placeholder="Add a name" placeholderTextColor={colors.muted} style={[styles.input, { flex: 1 }]} onSubmitEditing={addName} accessibilityLabel="Name to keep private" />
            <Button compact kind="soft" label="Add" disabled={name.trim().length < 2} onPress={addName} />
          </View>
        </Card>

        {/* Reminders */}
        <NotificationCard />
        <DisciplineSettings />
        <CalendarCard />

        {/* Privacy and feel */}
        <Card style={{ gap: space(1.25) }}>
          <T variant="h2">On this phone</T>
          <T variant="label">Keep chat transcripts for</T>
          <View style={styles.wrap}>
            {RETENTION.map((r) => (
              <Chip key={r.d} label={r.label} selected={state.prefs.transcriptDays === r.d} onPress={() => dispatch({ type: 'setPrefs', prefs: { transcriptDays: r.d } })} />
            ))}
          </View>
          <T variant="caption">Full conversations stay only on this phone. Only short summaries you approve are saved to your account. Voice audio is never stored.</T>
          <Toggle title="Krishna speaks replies aloud" sub="Uses your phone's own voice. Hold the mic button in Mentor to talk back." value={state.prefs.speakReplies} onChange={(v) => dispatch({ type: 'setPrefs', prefs: { speakReplies: v } })} />
          <Toggle title="Haptic taps" value={state.prefs.haptics} onChange={(v) => dispatch({ type: 'setPrefs', prefs: { haptics: v } })} />
          <Toggle title="Sound cues" sub="Soft chimes for completions" value={state.prefs.sounds} onChange={(v) => dispatch({ type: 'setPrefs', prefs: { sounds: v } })} />
        </Card>

        <Card style={{ gap: space(0.5) }}>
          <T variant="h2">Your data</T>
          <Row icon="bulb-outline" title="What Krishna remembers" sub="View, edit, delete, mark private" onPress={() => router.push('/memory')} />
          <Row icon="download-outline" title="Export or delete everything" sub="In Me → Privacy" onPress={() => router.push('/me')} />
          <Row icon="document-text-outline" title="Privacy policy" sub="What is stored, and who can see it" onPress={() => openUrl(PRIVACY_URL)} />
          <Row icon="trash-outline" title="How to delete your account" sub="In the app or by email" onPress={() => openUrl(DELETE_URL)} />
        </Card>

        <Card tone="sand" style={{ gap: space(1) }}>
          <T variant="h2">Account</T>
          {session ? <T variant="body">{session.user.email}</T> : null}
          <T variant="caption">{sync.status === 'synced' ? 'Backed up to your private cloud.' : sync.status === 'local-only' ? 'Stored on this phone only.' : `Sync: ${sync.status}`}</T>
          {session ? <Button kind="ghost" label="Sign out" onPress={signOut} /> : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space(2.5), gap: space(2), paddingBottom: space(6), maxWidth: 640, width: '100%', alignSelf: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), minHeight: 56 },
  toggleTitle: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  toggleSub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.muted },
  input: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.hairline, paddingHorizontal: space(2), fontFamily: fonts.body, fontSize: 16, color: colors.ink },
});
