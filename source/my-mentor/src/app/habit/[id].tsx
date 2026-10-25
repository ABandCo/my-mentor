import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Bars, DayCircle, HeatGrid } from '@/components/charts';
import { HabitForm } from '@/components/habit-form';
import { IconButton, Pill, ScreenHeader, StatTile } from '@/components/kit';
import { Button, Card, EmptyState, SectionTitle, T, tap } from '@/components/ui';
import { bestStreak, habitStats, habitStreak, isScheduled, statusOn, weekdayPattern } from '@/lib/habit-stats';
import { colorOf, DAY_NAMES, habitsWithMeta, proposals } from '@/lib/habits';
import { dateKey, lastNDates } from '@/lib/metrics';
import { useStore } from '@/lib/store';
import { colors, fonts, space } from '@/theme/tokens';

export default function HabitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const today = dateKey();
  const hs = habitsWithMeta(state);
  const h = hs.find((x) => x.id === id);
  const [edit, setEdit] = useState(false);
  const base = { habitLogs: state.habitLogs };

  const days30 = lastNDates(30);
  const days35 = lastNDates(35);
  const days90 = lastNDates(90);
  const stats30 = h ? habitStats(base, h, days30, today) : null;
  const stats90 = h ? habitStats(base, h, days90, today) : null;
  const pattern = h ? weekdayPattern(base, h, days90, today) : [];
  const mine = useMemo(() => (h ? proposals({ habits: state.habits, habitLogs: state.habitLogs, collections: state.collections }, today).filter((p) => p.habitId === h.id) : []), [h, state.habits, state.habitLogs, state.collections, today]);

  if (!h) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ScreenHeader title="Habit" left={<IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />} />
          <EmptyState emoji="🔍" title="Habit not found" body="It may have been archived." />
        </ScrollView>
      </SafeAreaView>
    );
  }
  const c = colorOf(h);
  const done30 = days35.reduce((m, d) => ({ ...m, [d]: statusOn(base, h.id, d) === 'done' ? 1 : 0 }), {} as Record<string, number>);
  const last7 = lastNDates(7);
  const worst = pattern.map((w, i) => ({ ...w, i })).filter((w) => w.eligible >= 3).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={`${h.emoji} ${h.name}`} left={<IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />} right={<IconButton icon="create-outline" label="Edit habit" tone="soft" onPress={() => setEdit(true)} />} />

        {h.purpose ? (
          <Card tone="honey">
            <T variant="label" style={{ color: colors.accentText }}>
              YOUR WHY
            </T>
            <T variant="title">{h.purpose}</T>
          </Card>
        ) : null}

        <View style={{ flexDirection: 'row', gap: space(1.5) }}>
          <StatTile tone="sage" value={`🔥 ${habitStreak(base, h, today)}`} label="Current streak" />
          <StatTile tone="honey" value={String(bestStreak(base, h, today))} label="Best streak" />
          <StatTile value={stats30?.pct == null ? '—' : `${stats30.pct}%`} label="Last 30 days" />
        </View>

        <Card style={{ gap: space(1.5) }}>
          <SectionTitle title="This week" action={<Pill label={h.days && h.days.length ? h.days.map((d) => DAY_NAMES[d].slice(0, 3)).join(' ') : 'Every day'} tone="sand" />} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {last7.map((d) => (
              <DayCircle key={d} date={d} color={c} status={statusOn(base, h.id, d)} scheduled={isScheduled(h, d)} isToday={d === today} onPress={() => dispatch({ type: 'logHabit', date: d, habitId: h.id, status: statusOn(base, h.id, d) === 'done' ? undefined : 'done' })} />
            ))}
          </View>
          {h.minVersion ? <T variant="caption">Minimum version for a bad day: {h.minVersion}</T> : null}
        </Card>

        <Card style={{ gap: space(1.5) }}>
          <SectionTitle title="Last 5 weeks" />
          <View style={{ alignItems: 'center' }}>
            <HeatGrid dates={days35} values={done30} max={1} color={c} cell={38} gap={5} />
          </View>
        </Card>

        <Card style={{ gap: space(1) }}>
          <SectionTitle title="Which weekdays work for you" />
          <Bars color={c} suffix="%" items={pattern.map((w, i) => ({ label: DAY_NAMES[i].slice(0, 1), value: w.pct ?? 0 }))} />
          <T variant="caption">
            {worst && (worst.pct ?? 100) < 50
              ? `${DAY_NAMES[worst.i]}s are your hardest day (${worst.done} of ${worst.eligible} done). Plan for it in advance.`
              : stats90 && stats90.eligible >= 6
                ? 'No weekday stands out as a problem.'
                : 'Needs more answered days to show a pattern. Based on the last 90 days.'}
          </T>
        </Card>

        <Card style={{ flexDirection: 'row', gap: space(1.5) }}>
          <StatTile tone="sand" value={String(stats90?.done ?? 0)} label="Done (90 d)" />
          <StatTile tone="sand" value={String(stats90?.missed ?? 0)} label="Missed" />
          <StatTile tone="sand" value={String(stats90?.unrecorded ?? 0)} label="Not recorded" sub="not a miss" />
        </Card>

        {h.timerMin ? <Timer minutes={h.timerMin} color={c} onDone={() => dispatch({ type: 'logHabit', date: today, habitId: h.id, status: 'done' })} /> : null}

        {mine.map((p) => (
          <Card key={p.id} tone="sage" style={{ gap: 8 }}>
            <T variant="title">{p.title}</T>
            <T variant="body">{p.detail}</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button compact label="Approve" style={{ flex: 1 }} onPress={() => dispatch({ type: 'col/put', table: 'habit_meta', row: { id: h.id, ...p.patch } })} />
              <Button compact kind="ghost" label="Not now" style={{ flex: 1 }} onPress={() => dispatch({ type: 'col/put', table: 'habit_meta', row: { id: h.id, dismissed: [...(h.dismissed ?? []), p.id] } })} />
            </View>
          </Card>
        ))}

        <Button kind="soft" label="Talk to Krishna about this habit" onPress={() => router.push('/mentor')} />
      </ScrollView>
      <HabitForm visible={edit} onClose={() => setEdit(false)} habitId={h.id} />
    </SafeAreaView>
  );
}

function Timer({ minutes, color, onDone }: { minutes: number; color: string; onDone: () => void }) {
  const total = minutes * 60;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const iv = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!running) return;
    iv.current = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => {
      if (iv.current) clearInterval(iv.current);
    };
  }, [running]);
  useEffect(() => {
    if (left === 0 && running) {
      setRunning(false);
      tap('success');
    }
  }, [left, running]);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <Card style={{ alignItems: 'center', gap: space(1.5) }}>
      <T variant="label">FOCUS TIMER</T>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 52, color }} accessibilityLabel={`${mm} minutes ${ss} seconds left`}>
        {mm}:{ss}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
        {left === 0 ? (
          <Button style={{ flex: 1 }} label="Mark done" onPress={onDone} />
        ) : (
          <Button style={{ flex: 1 }} label={running ? 'Pause' : left === total ? 'Start' : 'Resume'} onPress={() => setRunning((r) => !r)} />
        )}
        <Button kind="ghost" style={{ flex: 1 }} label="Reset" onPress={() => { setRunning(false); setLeft(total); }} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space(2.5), paddingBottom: space(6), gap: space(2), maxWidth: 640, width: '100%', alignSelf: 'center' },
});
