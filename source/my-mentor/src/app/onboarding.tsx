import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MentorOrb, OrbState } from '@/components/mentor-orb';
import { Button, Card, T, tap } from '@/components/ui';
import { dateKey } from '@/lib/metrics';
import { CoachingStyle, Language, Profile, useStore } from '@/lib/store';
import { colors, fonts, radius, space } from '@/theme/tokens';

const STEPS = 9;

const LANGS: { v: Language; label: string; sub: string }[] = [
  { v: 'en', label: 'English', sub: 'Everything in English' },
  { v: 'hi', label: 'हिन्दी', sub: 'Mentor speaks Hindi' },
  { v: 'hinglish', label: 'Hinglish', sub: 'Mix, jaise hum baat karte hain' },
];

const STYLES: { v: CoachingStyle; label: string; preview: string }[] = [
  { v: 'strict', label: 'Strict and direct', preview: '"Three BD actions planned, none done. What got in the way, and what will you finish today?"' },
  { v: 'balanced', label: 'Balanced', preview: '"Good progress on habits. The proposals slipped — shall we make them smaller?"' },
  { v: 'gentle', label: 'Gentle', preview: '"Tough week. One small step today is enough to restart."' },
  { v: 'reflective', label: 'Deep reflection', preview: '"What pattern do you notice in the days you skip deep work?"' },
  { v: 'communication', label: 'Communication trainer', preview: '"Say that again in two sentences, starting with the client\'s benefit."' },
  { v: 'business', label: 'Business strategist', preview: '"Which two leads are closest to closing? Follow up before noon."' },
];

const FOCUS = [
  { v: 'accountability', label: '⏱️ Accountability' },
  { v: 'communication', label: '🎙️ Communication Lab' },
  { v: 'practice', label: '💼 CA/CS practice growth' },
  { v: 'health', label: '🌿 Habits & health' },
  { v: 'couple', label: '💞 Couple Space' },
];

const BASELINES = [
  { k: 'sleepHours', label: 'Average hours of sleep', unit: 'hours' },
  { k: 'waterGlasses', label: 'Glasses of water a day', unit: 'glasses' },
  { k: 'exerciseDays', label: 'Exercise days a week', unit: 'days' },
  { k: 'deepWorkHours', label: 'Focused work hours a day', unit: 'hours' },
  { k: 'monthlyFeeRealised', label: 'Fees realised last month', unit: '₹' },
  { k: 'activeLeads', label: 'Active leads right now', unit: 'leads' },
];

function shift(t: string, mins: number) {
  const [h, m] = t.split(':').map(Number);
  const total = (((h * 60 + m + mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function Onboarding() {
  const { state, dispatch } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(state.name);
  const [p, setP] = useState<Profile>(state.profile);
  const [notif, setNotif] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [baseDraft, setBaseDraft] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(state.profile.baselines).map(([k, v]) => [k, String(v)])),
  );
  const [tiny, setTiny] = useState('');
  const [tinyDone, setTinyDone] = useState(false);

  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));
  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const orb: OrbState = step === 0 ? 'speaking' : step === STEPS - 1 && tinyDone ? 'celebrating' : step === 6 ? 'thinking' : 'idle';

  const askNotifications = async () => {
    if (Platform.OS === 'web') return setNotif('denied');
    const res = await Notifications.requestPermissionsAsync();
    setNotif(res.granted ? 'granted' : 'denied');
  };

  const saveBaselines = () => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(baseDraft)) {
      const n = Number(v.replace(/[,₹\s]/g, ''));
      if (v.trim() && Number.isFinite(n) && n >= 0) out[k] = n;
    }
    set({ baselines: out });
    return out;
  };

  const finish = () => {
    const baselines = saveBaselines();
    dispatch({ type: 'setName', name: name.trim() });
    dispatch({ type: 'setProfile', profile: { ...p, baselines, onboardedAt: new Date().toISOString() } });
    router.replace('/');
  };

  let body: ReactNode;
  let canNext = true;
  switch (step) {
    case 0:
      canNext = !!name.trim();
      body = (
        <>
          <T variant="hero">{name.trim() ? `Namaste, ${name.trim()}.` : 'Namaste.'}</T>
          <T variant="body" style={{ color: colors.muted }}>
            I'm your mentor. I'll help you turn plans into action, and I'll only talk about what you actually record. What should I call you?
          </T>
          <TextInput value={name} onChangeText={setName} placeholder="Your first name" placeholderTextColor={colors.muted} style={styles.input} autoFocus />
        </>
      );
      break;
    case 1:
      body = (
        <>
          <T variant="h1" hi="भाषा">
            Language
          </T>
          {LANGS.map((l) => (
            <Option key={l.v} selected={p.language === l.v} onPress={() => set({ language: l.v })} title={l.label} sub={l.sub} />
          ))}
        </>
      );
      break;
    case 2:
      body = (
        <>
          <T variant="h1">Coaching style</T>
          <T variant="body" style={{ color: colors.muted }}>
            Firm is never rude. You can change this any time.
          </T>
          {STYLES.map((s) => (
            <Option key={s.v} selected={p.coachingStyle === s.v} onPress={() => set({ coachingStyle: s.v })} title={s.label} sub={s.preview} />
          ))}
        </>
      );
      break;
    case 3:
      canNext = p.focusAreas.length > 0;
      body = (
        <>
          <T variant="h1">What matters most now?</T>
          {FOCUS.map((f) => {
            const on = p.focusAreas.includes(f.v);
            return (
              <Option
                key={f.v}
                selected={on}
                onPress={() => set({ focusAreas: on ? p.focusAreas.filter((x) => x !== f.v) : [...p.focusAreas, f.v] })}
                title={f.label}
                multi
              />
            );
          })}
        </>
      );
      break;
    case 4:
      body = (
        <>
          <T variant="h1">Your day</T>
          <T variant="body" style={{ color: colors.muted }}>
            Hourly check-ins happen only inside your accountability window, never in quiet hours.
          </T>
          <TimeRow label="Wake up" value={p.wake} onChange={(v) => set({ wake: v })} />
          <TimeRow label="Sleep" value={p.sleep} onChange={(v) => set({ sleep: v })} />
          <TimeRow label="Hourly check-ins from" value={p.intensiveStart} onChange={(v) => set({ intensiveStart: v })} />
          <TimeRow label="Hourly check-ins until" value={p.intensiveEnd} onChange={(v) => set({ intensiveEnd: v })} />
          <TimeRow label="Quiet hours start" value={p.quietStart} onChange={(v) => set({ quietStart: v })} />
          <TimeRow label="Quiet hours end" value={p.quietEnd} onChange={(v) => set({ quietEnd: v })} />
        </>
      );
      break;
    case 5:
      body = (
        <>
          <T variant="h1">Reminders</T>
          <T variant="body" style={{ color: colors.muted }}>
            To check in with you each hour, the app needs permission to show notifications. You can pause them for client work or family time, or switch them off, at any
            time.
          </T>
          {notif === 'unknown' ? <Button label="Allow notifications" onPress={askNotifications} /> : null}
          {notif === 'granted' ? (
            <Card tone="sage">
              <T variant="title">✓ Notifications allowed</T>
            </Card>
          ) : null}
          {notif === 'denied' ? (
            <Card tone="honey" style={{ gap: space(1) }}>
              <T variant="title">{Platform.OS === 'web' ? 'Not available in the browser preview' : 'Notifications are blocked'}</T>
              <T variant="body">
                Open Settings → Apps → My Mentor → Notifications and turn them on. Also set Battery → "Unrestricted" so Android doesn't delay check-ins.
              </T>
              {Platform.OS !== 'web' ? <Button kind="soft" label="Open phone settings" onPress={() => Linking.openSettings()} /> : null}
            </Card>
          ) : null}
        </>
      );
      break;
    case 6:
      body = (
        <>
          <T variant="h1">Privacy and AI</T>
          <T variant="body" style={{ color: colors.muted }}>
            Your data is stored in your own private account (Mumbai region). Only you can read it. When the mentor uses AI, the text you send goes to Google's free
            Gemini service, which may use it to improve its products. So you choose what may be sent.
          </T>
          <Toggle
            title="Let the mentor use AI for plans, habits and work"
            sub="Client names are replaced with placeholders before sending."
            value={p.aiConsentGeneral}
            onChange={(v) => set({ aiConsentGeneral: v, aiConsentSensitive: v ? p.aiConsentSensitive : false })}
          />
          <Toggle
            title="Also allow health, family and journal entries"
            sub="Off by default. Highly personal."
            value={p.aiConsentSensitive}
            disabled={!p.aiConsentGeneral}
            onChange={(v) => set({ aiConsentSensitive: v })}
          />
          <T variant="caption">You can export or permanently delete everything from Me → Privacy.</T>
        </>
      );
      break;
    case 7:
      body = (
        <>
          <T variant="h1">Where you're starting</T>
          <T variant="body" style={{ color: colors.muted }}>
            Real numbers only. Leave anything blank and add it later. I'll never guess.
          </T>
          {BASELINES.map((b) => (
            <View key={b.k} style={styles.baseRow}>
              <T variant="body" style={{ flex: 1 }}>
                {b.label}
              </T>
              <TextInput
                value={baseDraft[b.k] ?? ''}
                onChangeText={(v) => setBaseDraft((d) => ({ ...d, [b.k]: v }))}
                keyboardType="numeric"
                placeholder={b.unit}
                placeholderTextColor={colors.muted}
                style={[styles.input, { width: 110, textAlign: 'right' }]}
                accessibilityLabel={b.label}
              />
            </View>
          ))}
        </>
      );
      break;
    case 8:
      body = (
        <>
          <T variant="h1">Your first win</T>
          <T variant="body" style={{ color: colors.muted }}>
            Pick one tiny action you can do in the next five minutes. Do it, then tap Done.
          </T>
          {!tinyDone ? (
            <>
              <TextInput
                value={tiny}
                onChangeText={setTiny}
                placeholder="e.g. Drink a glass of water"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              <Button
                label="I did it ✓"
                kind="gold"
                disabled={!tiny.trim()}
                onPress={() => {
                  tap('success');
                  const d = dateKey();
                  if (!state.oneThing[d]) {
                    dispatch({ type: 'setOneThing', date: d, text: tiny.trim() });
                    dispatch({ type: 'toggleOneThing', date: d });
                  }
                  setTinyDone(true);
                }}
              />
            </>
          ) : (
            <Card tone="honey">
              <T variant="h2">Done. That's how every streak starts. 🌟</T>
            </Card>
          )}
        </>
      );
      break;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.progress}>
        {Array.from({ length: STEPS }, (_, i) => (
          <View key={i} style={[styles.dot, i <= step && { backgroundColor: colors.primary }]} />
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center' }}>
          <MentorOrb size={step === 0 ? 140 : 72} state={orb} />
        </View>
        <Animated.View key={step} entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} style={{ gap: space(1.5) }}>
          {body}
        </Animated.View>
      </ScrollView>
      <View style={styles.footer}>
        {step > 0 ? <Button label="Back" kind="ghost" onPress={back} style={{ flex: 1 }} /> : null}
        {step === 7 ? <Button label="Skip for now" kind="soft" onPress={next} style={{ flex: 1 }} /> : null}
        {step < STEPS - 1 ? (
          <Button
            label="Continue"
            disabled={!canNext}
            onPress={() => {
              if (step === 7) saveBaselines();
              next();
            }}
            style={{ flex: 1.4 }}
          />
        ) : (
          <Button label={tinyDone ? "Let's go" : 'Skip for now'} kind={tinyDone ? 'primary' : 'soft'} onPress={finish} style={{ flex: 1.4 }} />
        )}
      </View>
    </SafeAreaView>
  );
}

function Option({ selected, onPress, title, sub, multi }: { selected: boolean; onPress: () => void; title: string; sub?: string; multi?: boolean }) {
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.option, selected && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.optTitle}>{title}</Text>
        {sub ? <Text style={styles.optSub}>{sub}</Text> : null}
      </View>
      <View style={[styles.radio, multi && { borderRadius: 6 }, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
        {selected ? <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

function TimeRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.baseRow}>
      <T variant="body" style={{ flex: 1 }}>
        {label}
      </T>
      <Button compact kind="ghost" label="−" onPress={() => onChange(shift(value, -30))} />
      <Text style={styles.time} accessibilityLabel={`${label} ${value}`}>
        {value}
      </Text>
      <Button compact kind="ghost" label="+" onPress={() => onChange(shift(value, 30))} />
    </View>
  );
}

function Toggle({ title, sub, value, onChange, disabled }: { title: string; sub: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space(1.5), opacity: disabled ? 0.5 : 1 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="title">{title}</T>
        <T variant="caption">{sub}</T>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={title}
        trackColor={{ true: colors.primary, false: colors.hairline }}
        thumbColor="#fff"
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 6, justifyContent: 'center', paddingTop: space(2) },
  dot: { width: 22, height: 4, borderRadius: 2, backgroundColor: colors.hairline },
  scroll: { padding: space(3), gap: space(2), maxWidth: 560, width: '100%', alignSelf: 'center', paddingBottom: space(4) },
  footer: { flexDirection: 'row', gap: space(1.5), padding: space(2.5), maxWidth: 560, width: '100%', alignSelf: 'center' },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    paddingHorizontal: space(2),
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    padding: space(2),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    minHeight: 56,
  },
  optTitle: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  optSub: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  baseRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
  time: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink, minWidth: 64, textAlign: 'center' },
});
