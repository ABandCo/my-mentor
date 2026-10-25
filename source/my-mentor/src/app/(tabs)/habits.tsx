import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Bars, DayCircle, HBar, HeatGrid } from '@/components/charts';
import { HabitForm, TEMPLATES } from '@/components/habit-form';
import { Icon, IconButton, Pill, Row, Segmented, Sheet, StatTile } from '@/components/kit';
import { WaterRow } from '@/components/discipline-card';
import { Button, Card, EmptyState, ProgressRing, SectionTitle, T, tap } from '@/components/ui';
import { bestStreak, habitStats, habitStreak, heatmap, isScheduled, statusOn } from '@/lib/habit-stats';
import { colorOf, proposals } from '@/lib/habits';
import { habitsWithMeta } from '@/lib/habits';
import { dateKey, lastNDates, streaks } from '@/lib/metrics';
import { pushList } from '@/lib/push-coach';
import type { HabitStatus } from '@/lib/store';
import { useStore } from '@/lib/store';
import { colors, fonts, radius, space } from '@/theme/tokens';

type View_ = 'daily' | 'weekly' | 'monthly' | 'yearly';
const STATUSES: { s: HabitStatus; label: string }[] = [
  { s: 'done', label: '✓ Done' },
  { s: 'partial', label: '◐ Partial' },
  { s: 'missed', label: '✕ Missed' },
  { s: 'rest', label: '☾ Rest day' },
  { s: 'na', label: 'N/A' },
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Habits() {
  const { state, dispatch } = useStore();
  const today = dateKey();
  const [view, setView] = useState<View_>('daily');
  const [form, setForm] = useState<{ open: boolean; id?: string; preset?: { name: string; emoji: string; min?: string } }>({ open: false });
  const [sheet, setSheet] = useState<{ habitId: string; date: string } | null>(null);

  const hs = useMemo(() => habitsWithMeta(state), [state.habits, state.collections.habit_meta]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = { habitLogs: state.habitLogs };
  const week = lastNDates(7);
  const month = lastNDates(35);
  const days30 = lastNDates(30);
  const st = streaks(state, today);

  const scheduledToday = hs.filter((h) => isScheduled(h, today));
  const doneToday = scheduledToday.filter((h) => statusOn(base, h.id, today) === 'done').length;
  const weekStats = hs.map((h) => habitStats(base, h, week, today));
  const wDone = weekStats.reduce((a, x) => a + x.done, 0);
  const wElig = weekStats.reduce((a, x) => a + x.eligible, 0);
  const weekPct = wElig ? Math.round((wDone / wElig) * 100) : null;
  const props = useMemo(() => proposals({ habits: state.habits, habitLogs: state.habitLogs, collections: state.collections }, today), [state.habits, state.habitLogs, state.collections, today]);
  const pushes = useMemo(() => pushList(state).filter((p) => p.severity !== 'win').slice(0, 2), [state]);

  const setStatus = (habitId: string, date: string, status: HabitStatus | undefined) => dispatch({ type: 'logHabit', date, habitId, status });
  const toggleDone = (habitId: string, date: string) => {
    const cur = statusOn(base, habitId, date);
    tap(cur === 'done' ? 'light' : 'success');
    setStatus(habitId, date, cur === 'done' ? undefined : 'done');
  };

  const sheetHabit = sheet ? hs.find((h) => h.id === sheet.habitId) : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <T variant="h1" hi="आदतें">
              Habits
            </T>
          </View>
          <IconButton icon="flag-outline" label="Goals" tone="soft" onPress={() => router.push('/goals')} />
          <IconButton icon="calendar-outline" label="Planner" tone="soft" onPress={() => router.push('/planner')} />
          <IconButton icon="add" label="Add habit" tone="primary" onPress={() => setForm({ open: true })} />
        </View>

        <Segmented<View_>
          value={view}
          onChange={setView}
          options={[
            { key: 'daily', label: 'Daily' },
            { key: 'weekly', label: 'Weekly' },
            { key: 'monthly', label: 'Monthly' },
            { key: 'yearly', label: 'Yearly' },
          ]}
        />

        <Card><WaterRow /></Card>

        {/* Insights strip: always visible */}
        <Animated.View entering={FadeInDown.duration(300)} style={{ flexDirection: 'row', gap: space(1.5) }}>
          <Card style={styles.ringCard}>
            <ProgressRing size={74} stroke={8} progress={scheduledToday.length ? doneToday / scheduledToday.length : 0}>
              <Text style={styles.ringNum}>
                {doneToday}/{scheduledToday.length}
              </Text>
            </ProgressRing>
            <T variant="caption">Done today</T>
          </Card>
          <View style={{ flex: 1.4, gap: space(1.5) }}>
            <View style={{ flexDirection: 'row', gap: space(1.5) }}>
              <StatTile value={weekPct === null ? '—' : `${weekPct}%`} label="This week" tone="sage" />
              <StatTile value={`🔥 ${st.streak}`} label="Day streak" tone="honey" />
            </View>
            <T variant="caption">{wElig ? `${wDone} of ${wElig} answered habit-days done` : 'Log a few days to see your rate'}</T>
          </View>
        </Animated.View>

        {/* Krishna's push */}
        {pushes.map((p) => (
          <Card key={p.id} tone={p.severity === 'high' ? 'sand' : 'honey'} style={{ gap: 6, borderLeftWidth: 5, borderLeftColor: p.severity === 'high' ? colors.firm : colors.accent }}>
            <T variant="label" style={{ color: p.severity === 'high' ? colors.firmText : colors.accentText }}>
              KRISHNA'S PUSH
            </T>
            <T variant="title">{p.title}</T>
            <T variant="body">{p.body}</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {p.action ? <Button compact kind="soft" label={p.action.label} onPress={() => router.push(p.action!.route as never)} /> : null}
              <Button compact kind="ghost" label="Talk it through" onPress={() => router.push('/mentor')} />
            </View>
          </Card>
        ))}

        {hs.length === 0 ? (
          <>
            <EmptyState emoji="🌱" title="No habits yet" body="Pick one below. Small and consistent beats big and rare." />
            <SectionTitle title="Quick start" />
            <View style={styles.wrap}>
              {TEMPLATES.map((t) => (
                <Pressable key={t.name} onPress={() => setForm({ open: true, preset: { name: t.name, emoji: t.emoji, min: t.min } })} style={styles.tpl} accessibilityRole="button">
                  <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
                  <Text style={styles.tplText}>{t.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {/* DAILY */}
        {view === 'daily' && hs.length > 0 && (
          <View style={{ gap: space(1.5) }}>
            {hs.map((h, i) => {
              const c = colorOf(h, i);
              const sc = isScheduled(h, today);
              const s = statusOn(base, h.id, today);
              const streak = habitStreak(base, h, today);
              return (
                <Pressable key={h.id} onPress={() => router.push(`/habit/${h.id}`)} accessibilityRole="button" accessibilityLabel={`${h.name}, open details`}>
                  <Card style={[styles.hCard, { borderLeftColor: c }]}>
                    <View style={styles.hTop}>
                      <View style={[styles.emoji, { backgroundColor: c + '22' }]}>
                        <Text style={{ fontSize: 22 }}>{h.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.hName} numberOfLines={1}>
                          {h.name}
                        </Text>
                        <Text style={styles.hSub}>
                          {streak > 0 ? `🔥 ${streak} day streak` : 'No streak yet'}
                          {h.targetValue ? ` · ${h.targetValue}${h.unit ? ' ' + h.unit : ''}` : ''}
                          {!sc ? ' · rest day' : ''}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: s === 'done' }}
                        accessibilityLabel={`Mark ${h.name} done for today`}
                        onPress={() => toggleDone(h.id, today)}
                        onLongPress={() => setSheet({ habitId: h.id, date: today })}
                        style={[styles.check, { borderColor: c }, s === 'done' && { backgroundColor: c }]}>
                        {s === 'done' ? <Icon name="checkmark" size={22} color="#fff" /> : s ? <Text style={{ color: c, fontFamily: fonts.bodyBold }}>{s === 'partial' ? '◐' : s === 'missed' ? '✕' : '☾'}</Text> : null}
                      </Pressable>
                    </View>
                    <View style={styles.dots}>
                      {week.map((d) => (
                        <DayCircle key={d} date={d} color={c} size={34} status={statusOn(base, h.id, d)} scheduled={isScheduled(h, d)} isToday={d === today} onPress={() => toggleDone(h.id, d)} onLongPress={() => setSheet({ habitId: h.id, date: d })} />
                      ))}
                    </View>
                    {h.minVersion && s !== 'done' ? <Text style={styles.minv}>Bad day? Minimum: {h.minVersion}</Text> : null}
                  </Card>
                </Pressable>
              );
            })}
            <T variant="caption">Tap a circle to mark done. Press and hold for partial, missed, rest or N/A. Days without a tick are shown as unrecorded, never as missed.</T>
          </View>
        )}

        {/* WEEKLY */}
        {view === 'weekly' && hs.length > 0 && (
          <View style={{ gap: space(1.5) }}>
            <Card>
              <SectionTitle title="Habits done per day" />
              <Bars color={colors.primary} items={week.map((d) => ({ label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(`${d}T12:00:00+05:30`).getUTCDay()], value: hs.filter((h) => statusOn(base, h.id, d) === 'done').length, highlight: d === today }))} />
            </Card>
            {hs.map((h, i) => {
              const s = weekStats[i];
              const c = colorOf(h, i);
              return (
                <Card key={h.id} style={{ gap: space(1) }}>
                  <HBar label={`${h.emoji}  ${h.name}`} value={s.pct ?? 0} color={c} right={s.pct === null ? 'no data' : `${s.pct}%  (${s.done}/${s.eligible})`} />
                  <Text style={styles.hSub}>{s.unrecorded ? `${s.unrecorded} day(s) not recorded` : 'Every scheduled day answered'}</Text>
                </Card>
              );
            })}
          </View>
        )}

        {/* MONTHLY */}
        {view === 'monthly' && hs.length > 0 && (
          <View style={{ gap: space(1.5) }}>
            <Card style={{ gap: space(1.5) }}>
              <SectionTitle title="Last 5 weeks" action={<Pill label={`${hs.length} habits`} />} />
              <View style={{ alignItems: 'center' }}>
                <HeatGrid dates={month} values={heatmap(base, hs, month)} max={Math.max(1, hs.length)} color={colors.primary} cell={38} gap={5} />
              </View>
              <T variant="caption">Darker = more habits done that day.</T>
            </Card>
            <Card style={{ gap: space(1.5) }}>
              <SectionTitle title="Top habits (30 days)" />
              {hs
                .map((h, i) => ({ h, i, s: habitStats(base, h, days30, today) }))
                .sort((a, b) => (b.s.pct ?? -1) - (a.s.pct ?? -1))
                .map(({ h, i, s }) => (
                  <HBar key={h.id} label={`${h.emoji}  ${h.name}`} value={s.pct ?? 0} color={colorOf(h, i)} right={s.pct === null ? 'no data' : `${s.pct}%`} />
                ))}
            </Card>
            <Card style={{ flexDirection: 'row', gap: space(1.5) }}>
              <StatTile tone="sand" value={String(Object.values(heatmap(base, hs, days30)).reduce((a, b) => a + b, 0))} label="Habit-days done" />
              <StatTile tone="sand" value={String(Object.values(heatmap(base, hs, days30)).filter((v) => v === hs.length && hs.length > 0).length)} label="Perfect days" />
              <StatTile tone="sand" value={String(Math.max(0, ...hs.map((h) => bestStreak(base, h, today))))} label="Best streak" />
            </Card>
          </View>
        )}

        {/* YEARLY */}
        {view === 'yearly' && hs.length > 0 && <Yearly hs={hs} base={base} today={today} />}

        {/* Adaptive proposals */}
        {props.length > 0 && (
          <View style={{ gap: space(1.5) }}>
            <SectionTitle title="Krishna suggests" hi="सुझाव" />
            {props.slice(0, 3).map((p) => {
              const h = hs.find((x) => x.id === p.habitId);
              return (
                <Card key={p.id} tone="sage" style={{ gap: 8 }}>
                  <T variant="title">{p.title}</T>
                  <T variant="body">{p.detail}</T>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button
                      compact
                      label="Approve"
                      style={{ flex: 1 }}
                      onPress={() => dispatch({ type: 'col/put', table: 'habit_meta', row: { id: p.habitId, ...p.patch } })}
                    />
                    <Button
                      compact
                      kind="ghost"
                      label="Not now"
                      style={{ flex: 1 }}
                      onPress={() => dispatch({ type: 'col/put', table: 'habit_meta', row: { id: p.habitId, dismissed: [...(h?.dismissed ?? []), p.id] } })}
                    />
                  </View>
                </Card>
              );
            })}
            <T variant="caption">Nothing changes unless you approve it.</T>
          </View>
        )}

        {hs.length > 0 && (
          <View>
            <SectionTitle title="Add from templates" />
            <View style={styles.wrap}>
              {TEMPLATES.filter((t) => !hs.some((h) => h.name === t.name)).slice(0, 8).map((t) => (
                <Pressable key={t.name} onPress={() => setForm({ open: true, preset: { name: t.name, emoji: t.emoji, min: t.min } })} style={styles.tpl} accessibilityRole="button">
                  <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
                  <Text style={styles.tplText}>{t.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        <T variant="caption">Unrecorded days are shown separately and never counted as missed. Rest days and N/A are excluded from adherence.</T>
      </ScrollView>

      <HabitForm visible={form.open} onClose={() => setForm({ open: false })} habitId={form.id} preset={form.preset} />

      <Sheet visible={!!sheet} onClose={() => setSheet(null)} title={sheetHabit ? `${sheetHabit.emoji} ${sheetHabit.name}` : ''}>
        <Text style={styles.hSub}>{sheet?.date}</Text>
        <View style={{ gap: 8, marginTop: 8 }}>
          {STATUSES.map((x) => (
            <Button
              key={x.s}
              kind={sheet && statusOn(base, sheet.habitId, sheet.date) === x.s ? 'primary' : 'soft'}
              label={x.label}
              onPress={() => {
                if (sheet) setStatus(sheet.habitId, sheet.date, x.s);
                setSheet(null);
              }}
            />
          ))}
          <Button
            kind="ghost"
            label="Clear (not recorded)"
            onPress={() => {
              if (sheet) setStatus(sheet.habitId, sheet.date, undefined);
              setSheet(null);
            }}
          />
          {sheetHabit ? (
            <Row
              icon="stats-chart-outline"
              title="Open details and stats"
              onPress={() => {
                setSheet(null);
                router.push(`/habit/${sheetHabit.id}`);
              }}
            />
          ) : null}
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

function Yearly({ hs, base, today }: { hs: ReturnType<typeof habitsWithMeta>; base: { habitLogs: Record<string, Record<string, HabitStatus>> }; today: string }) {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const months = Array.from({ length: 12 }, (_, i) => {
    const mm = ((m - 1 - (11 - i) + 120) % 12) + 1;
    const yy = m - (11 - i) <= 0 ? y - 1 : y;
    return { key: `${yy}-${String(mm).padStart(2, '0')}`, label: MONTHS[mm - 1] };
  });
  const counts = months.map((mo) => {
    let n = 0;
    for (const [d, per] of Object.entries(base.habitLogs)) if (d.startsWith(mo.key)) for (const [hid, s] of Object.entries(per)) if (s === 'done' && hs.some((h) => h.id === hid)) n++;
    return n;
  });
  const days365 = lastNDates(365);
  return (
    <View style={{ gap: space(1.5) }}>
      <Card>
        <SectionTitle title="Habits done per month" />
        <Bars color={colors.primary} items={months.map((mo, i) => ({ label: mo.label, value: counts[i], highlight: mo.key === today.slice(0, 7) }))} />
      </Card>
      <Card style={{ gap: space(1.5) }}>
        <SectionTitle title="Year at a glance" />
        {hs
          .map((h, i) => ({ h, i, s: habitStats(base, h, days365, today) }))
          .sort((a, b) => (b.s.done) - (a.s.done))
          .map(({ h, i, s }) => (
            <HBar key={h.id} label={`${h.emoji}  ${h.name}`} value={s.pct ?? 0} color={colorOf(h, i)} right={s.eligible ? `${s.done} done · ${s.pct}%` : 'no data'} />
          ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space(2.5), paddingBottom: 140, gap: space(2), maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ringCard: { flex: 1, alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: space(2) },
  ringNum: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
  tpl: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: space(1.5), borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.hairline },
  tplText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  hCard: { gap: space(1.5), borderLeftWidth: 6, padding: space(2) },
  hTop: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
  emoji: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hName: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  hSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 1 },
  check: { width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'space-between' },
  minv: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.accentText },
});
