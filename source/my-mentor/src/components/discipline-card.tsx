// Today's discipline strip: score, water glasses, wake/sleep log, and the evening check-in with detox.
// All data lives in journal_entries rows (see lib/discipline.ts); one tap per action.
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Chip, T, tap } from '@/components/ui';
import { liveRows } from '@/lib/collections';
import {
  clockIst, configOf, detoxStreak, disciplineScore, eveningOf, eveningRow, lateByMin, shouldRecordWake, wakeOf, wakeRow, waterOn, waterRow, waterStreak,
} from '@/lib/discipline';
import { isScheduled } from '@/lib/habit-stats';
import { habitsWithMeta } from '@/lib/habits';
import { dateKey, istHour, streaks } from '@/lib/metrics';
import { lateWakeLine } from '@/lib/nudges';
import { notifyNow } from '@/lib/notifications';
import { useStore } from '@/lib/store';
import { dayOfYear, lessonFor } from '@/lib/wisdom';
import { say } from '@/lib/nudges';
import { colors, radius, space } from '@/theme/tokens';

const SLEEP_CHIPS = [
  { label: '10 se pehle', v: '21:45' },
  { label: '10–11', v: '22:30' },
  { label: '11–12', v: '23:30' },
  { label: '12 ke baad', v: '00:30' },
];

export function WaterRow({ compact }: { compact?: boolean }) {
  const { state, dispatch } = useStore();
  const cfg = configOf(state.collections);
  const today = dateKey();
  const n = waterOn(state.collections, today);
  const streak = waterStreak(state.collections, cfg.waterTarget, today);
  const set = (g: number) => {
    tap(g >= cfg.waterTarget ? 'success' : 'light');
    dispatch({ type: 'col/put', table: 'journal_entries', row: waterRow(today, g) });
  };
  return (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <T variant={compact ? 'label' : 'h2'}>💧 Paani {n}/{cfg.waterTarget}</T>
        <T variant="caption">{streak > 0 ? `${streak} din ka streak` : 'Aaj target poora karo'}</T>
      </View>
      <Button compact kind="ghost" label="−" onPress={() => set(n - 1)} disabled={n <= 0} />
      <Button compact kind={n >= cfg.waterTarget ? 'primary' : 'soft'} label="+1 glass" onPress={() => set(n + 1)} />
    </View>
  );
}

export function LessonRow({ lang, today }: { lang: 'hi' | 'en' | 'both'; today: string }) {
  const l = lessonFor(dayOfYear(today));
  return (
    <View style={{ gap: 4 }}>
      <T variant="label">KRISHNA KI SEEKH · {l.source.toUpperCase()}</T>
      <T variant="body">{say(l.idea, lang)}</T>
      <T variant="caption">▶ {say(l.action, lang)}</T>
    </View>
  );
}

const SUNDAY = [
  { en: '9:00 Time for each other: talk, assess the week', hi: '9:00 एक-दूसरे के लिए समय: बात करो, हफ़्ते का आकलन' },
  { en: '12:00 Billing sitting: raise pending invoices', hi: '12:00 बिलिंग की बैठक: बाकी इनवॉइस बनाओ' },
  { en: '15:00 Content with AI: draft posts, schedule for weekdays', hi: '15:00 AI से कंटेंट: पोस्ट बनाओ, हफ़्ते के लिए शेड्यूल करो' },
  { en: '18:00 Gyaan: one podcast or chapter together', hi: '18:00 ज्ञान: साथ में एक पॉडकास्ट या अध्याय' },
];
export function SundayRow({ lang }: { lang: 'hi' | 'en' | 'both' }) {
  return (
    <View style={{ gap: 4 }}>
      <T variant="label">RAVIVAR · AARAM NAHI, SAATH MEIN BADHNA</T>
      {SUNDAY.map((x) => (
        <T key={x.en} variant="caption">• {say(x, lang === 'both' ? 'hi' : lang)}</T>
      ))}
    </View>
  );
}

export function DisciplineCard() {
  const { state, dispatch } = useStore();
  const cols = state.collections;
  const cfg = configOf(cols);
  const today = dateKey();
  const hour = istHour();
  const wake = wakeOf(cols, today);
  const eve = eveningOf(cols, today);
  const [shipped, setShipped] = useState('');
  const [fix, setFix] = useState('');
  const [detox, setDetox] = useState<boolean | null>(null);

  // First open after 05:00 IST records the wake time (once).
  useEffect(() => {
    if (!state.hydrated || !shouldRecordWake(cols)) return;
    const time = clockIst();
    dispatch({ type: 'col/put', table: 'journal_entries', row: wakeRow(today, time) });
    const line = lateWakeLine(time, lateByMin(time, cfg.wakeTarget), cfg.nudgeLang);
    if (line && Platform.OS !== 'web' && cfg.role === 'arpan') notifyNow('Uthne ka time', line).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hydrated]);

  const score = useMemo(() => {
    const items = liveRows(cols, 'planner_items').filter((r) => r.date === today);
    const habits = habitsWithMeta(state).filter((h) => isScheduled(h, today));
    const one = state.oneThing[today];
    const logs = state.habitLogs[today] ?? {};
    const planned = items.length + habits.length + (one ? 1 : 0);
    const done = items.filter((r) => r.done).length + habits.filter((h) => logs[h.id] === 'done').length + (one?.done ? 1 : 0);
    return disciplineScore({
      planned,
      done,
      streakDays: streaks(state).streak,
      detoxStreak: detoxStreak(cols, today),
      waterMet: waterOn(cols, today) >= cfg.waterTarget,
    });
  }, [state, cols, today, cfg.waterTarget]);

  const late = wake ? lateByMin(wake.time, cfg.wakeTarget) : 0;
  const [eh, em] = cfg.eveningCheckin.split(':').map(Number);
  const [ch, cm] = clockIst().split(':').map(Number);
  const eveningOpen = ch * 60 + cm >= eh * 60 + em;
  const ds = detoxStreak(cols, today);

  return (
    <Card style={{ gap: space(2) }}>
      <View style={s.between}>
        <T variant="label">DISCIPLINE · AAJ KA SCORE</T>
        <T variant="h1" style={{ color: score.score !== null && score.score >= 50 ? colors.success : colors.firmText }}>{score.score ?? '–'}</T>
      </View>
      <T variant="caption">{score.label}{score.base !== null ? ` (kaam ${score.base}% + bonus ${score.bonus})` : ''}</T>

      <WaterRow />

      {wake ? (
        <View style={{ gap: 6 }}>
          <T variant="body">⏰ Aaj uthe: {wake.time}{late >= 30 ? ` · target ${cfg.wakeTarget}, ${late} min late` : ' · on time ✓'}</T>
          {late >= 30 ? <T variant="caption" style={{ color: colors.firmText }}>{lateWakeLine(wake.time, late, cfg.nudgeLang)}</T> : null}
          {!wake.sleptAt ? (
            <View style={{ gap: 6 }}>
              <T variant="caption">Kal raat kab soye?</T>
              <View style={s.chips}>
                {SLEEP_CHIPS.map((c) => (
                  <Chip key={c.v} label={c.label} onPress={() => dispatch({ type: 'col/put', table: 'journal_entries', row: wakeRow(today, wake.time, c.v) })} />
                ))}
              </View>
            </View>
          ) : (
            <T variant="caption">Soya: {wake.sleptAt}</T>
          )}
        </View>
      ) : null}

      <LessonRow lang={cfg.nudgeLang} today={today} />
      {new Date(Date.now() + 330 * 60000).getUTCDay() === 0 ? <SundayRow lang={cfg.nudgeLang} /> : null}

      <Button kind="gold" label="▶ Abhi 10 minute ka kaam shuru karo" onPress={() => router.push('/planner')} />

      {eveningOpen || eve ? (
        eve ? (
          <T variant="caption">🌙 Evening check-in ho gaya · detox {eve.detoxFree ? `✓ (${ds} din)` : '✕'}</T>
        ) : eveningOpen ? (
          <View style={{ gap: 8 }}>
            <T variant="label">EVENING CHECK-IN</T>
            <T variant="body">Aaj detox-free raha?</T>
            <View style={s.chips}>
              <Chip label="Haan" selected={detox === true} onPress={() => setDetox(true)} />
              <Chip label="Nahi" selected={detox === false} onPress={() => setDetox(false)} />
            </View>
            <TextInput value={shipped} onChangeText={setShipped} placeholder="Aaj kya ship kiya?" placeholderTextColor={colors.muted} style={s.input} />
            <TextInput value={fix} onChangeText={setFix} placeholder="Kal kya theek karoge?" placeholderTextColor={colors.muted} style={s.input} />
            <Button label="Save" disabled={detox === null} onPress={() => dispatch({ type: 'col/put', table: 'journal_entries', row: eveningRow({ date: today, detoxFree: detox === true, shipped: shipped.trim(), fix: fix.trim() }) })} />
          </View>
        ) : null
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.sm, padding: space(1.5), color: colors.ink, backgroundColor: colors.surface },
});
