import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DisciplineCard } from '@/components/discipline-card';
import { MentorOrb } from '@/components/mentor-orb';
import { Button, Card, Chip, EmptyState, ProgressRing, SectionTitle, Skeleton, T, tap } from '@/components/ui';
import { adherence, dateKey, hourKey, istHour, lastNDates, level, streaks } from '@/lib/metrics';
import { pushList } from '@/lib/push-coach';
import { HourStatus, useStore } from '@/lib/store';
import { colors, fonts, radius, space } from '@/theme/tokens';

const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

function greeting(h: number) {
  if (h < 5) return { en: 'Still up?', hi: 'अभी तक जाग रहे हो?' };
  if (h < 12) return { en: 'Good morning', hi: 'सुप्रभात' };
  if (h < 17) return { en: 'Good afternoon', hi: 'नमस्ते' };
  return { en: 'Good evening', hi: 'शुभ संध्या' };
}

export default function Home() {
  const { state, dispatch } = useStore();
  const today = dateKey();
  const hKey = hourKey();
  const hour = istHour();
  const g = greeting(hour);

  const one = state.oneThing[today];
  const hourPlan = state.hours[hKey];
  const [oneDraft, setOneDraft] = useState('');
  const [hourDraft, setHourDraft] = useState('');
  const [editingHour, setEditingHour] = useState(false);

  const week = useMemo(() => adherence(state, lastNDates(7)), [state]);
  const { streak, comebacks } = useMemo(() => streaks(state), [state]);
  const lv = level(state.xp);
  const push = useMemo(() => pushList(state).find((p) => p.severity === 'high' || p.severity === 'medium'), [state]);

  // Low-motivation mode: 3+ hour check-ins today answered "missed".
  const missedToday = Object.entries(state.hours).filter(([k, v]) => k.startsWith(today) && v.status === 'missed').length;
  const lowMotivation = missedToday >= 3;

  const openCommitments = state.commitments.filter((c) => !c.done).slice(0, 3);
  const todayLogs = state.habitLogs[today] ?? {};
  const habitsDone = state.habits.filter((h) => todayLogs[h.id] === 'done').length;

  if (!state.hydrated) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: space(2.5), gap: space(2) }}>
          <Skeleton height={140} />
          <Skeleton height={160} />
          <Skeleton height={120} />
        </View>
      </SafeAreaView>
    );
  }

  const answerHour = (status: HourStatus) => {
    tap(status === 'done' ? 'success' : 'light');
    dispatch({ type: 'setHourStatus', key: hKey, status });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Greeting + orb */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
          <View style={{ flex: 1, gap: 4 }}>
            <T variant="caption">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</T>
            <T variant="hero">
              {g.en}
              {state.name ? `,\n${state.name}` : ''}
            </T>
            <T variant="hindi">{g.hi}</T>
          </View>
          <Pressable onPress={() => router.push('/mentor')} accessibilityLabel="Open mentor">
            <MentorOrb size={92} state={lowMotivation ? 'firm' : one?.done ? 'celebrating' : 'idle'} />
          </Pressable>
        </Animated.View>

        {/* Mood tap */}
        <View style={styles.moodRow}>
          <T variant="label">How's your energy?</T>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {MOODS.map((m, i) => {
              const sel = state.mood[today] === i + 1;
              return (
                <Pressable
                  key={m}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={`Energy ${i + 1} of 5`}
                  onPress={() => {
                    tap();
                    dispatch({ type: 'setMood', date: today, mood: i + 1 });
                  }}
                  style={[styles.mood, sel && { backgroundColor: colors.accentSoft, transform: [{ scale: 1.1 }] }]}>
                  <Text style={{ fontSize: 20 }}>{m}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {push ? (
          <Animated.View entering={FadeInDown.delay(30)}>
            <Card tone={push.severity === 'high' ? 'sand' : 'honey'} style={{ gap: 6, borderLeftWidth: 5, borderLeftColor: push.severity === 'high' ? colors.firm : colors.accent }}>
              <T variant="label" style={{ color: push.severity === 'high' ? colors.firmText : colors.accentText }}>
                KRISHNA'S PUSH
              </T>
              <T variant="title">{push.title}</T>
              <T variant="body">{push.body}</T>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {push.action ? <Button compact kind="soft" label={push.action.label} onPress={() => router.push(push.action!.route as never)} /> : null}
                <Button compact kind="ghost" label="Talk it through" onPress={() => router.push('/mentor')} />
              </View>
            </Card>
          </Animated.View>
        ) : null}

        {lowMotivation ? (
          <Animated.View entering={FadeInDown}>
            <Card tone="honey" style={{ gap: space(1.5) }}>
              <T variant="label" style={{ color: colors.accentText }}>
                SMALLEST NEXT STEP
              </T>
              <T variant="h2">You don't need to repair the whole day. Pick one 10-minute action and do only that.</T>
              <Button label="Talk it through" kind="primary" onPress={() => router.push('/mentor')} />
            </Card>
          </Animated.View>
        ) : null}

        <DisciplineCard />

        {/* Today's One Thing */}
        <Animated.View entering={FadeInDown.delay(60).duration(350)}>
          <Card style={styles.hero}>
            <T variant="label" hi="आज का एक काम" style={{ color: colors.primaryText }}>
              TODAY'S ONE THING
            </T>
            {one ? (
              <>
                <T variant="h1" style={[one.done && styles.doneText]}>
                  {one.text}
                </T>
                <View style={styles.row}>
                  {!one.done ? <Button label="Start focus" icon="▶" style={{ flex: 1 }} onPress={() => router.push('/mentor')} /> : null}
                  <Button
                    label={one.done ? 'Done ✓  Undo?' : 'Mark done'}
                    kind={one.done ? 'soft' : 'gold'}
                    style={{ flex: 1 }}
                    onPress={() => {
                      tap('success');
                      dispatch({ type: 'toggleOneThing', date: today });
                    }}
                  />
                </View>
                {one.done ? (
                  <Animated.View entering={ZoomIn.springify()}>
                    <T variant="caption" style={{ color: colors.success }}>
                      +15 XP · The most important thing is done. Everything else is a bonus. 🌟
                    </T>
                  </Animated.View>
                ) : null}
              </>
            ) : (
              <>
                <T variant="body" style={{ color: colors.muted }}>
                  What single outcome would make today a win?
                </T>
                <TextInput
                  value={oneDraft}
                  onChangeText={setOneDraft}
                  placeholder="e.g. File the GST appeal reply"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={() => oneDraft.trim() && dispatch({ type: 'setOneThing', date: today, text: oneDraft.trim() })}
                />
                <Button
                  label="Set as today's One Thing"
                  disabled={!oneDraft.trim()}
                  onPress={() => dispatch({ type: 'setOneThing', date: today, text: oneDraft.trim() })}
                />
              </>
            )}
          </Card>
        </Animated.View>

        {/* Next hour */}
        <Animated.View entering={FadeInDown.delay(120).duration(350)}>
          <Card style={{ gap: space(1.5) }}>
            <View style={styles.rowBetween}>
              <T variant="label">
                THIS HOUR · {String(hour).padStart(2, '0')}:00–{String((hour + 1) % 24).padStart(2, '0')}:00
              </T>
              {hourPlan?.status ? <StatusPill status={hourPlan.status} /> : null}
            </View>
            {hourPlan?.plan && !editingHour ? (
              <>
                <T variant="h2">{hourPlan.plan}</T>
                <View style={styles.grid2}>
                  <Button compact label="Done" icon="✓" kind={hourPlan.status === 'done' ? 'primary' : 'soft'} onPress={() => answerHour('done')} style={styles.cell} />
                  <Button compact label="Partly" icon="◐" kind={hourPlan.status === 'partly' ? 'gold' : 'soft'} onPress={() => answerHour('partly')} style={styles.cell} />
                  <Button compact label="Missed" icon="✕" kind={hourPlan.status === 'missed' ? 'firm' : 'soft'} onPress={() => answerHour('missed')} style={styles.cell} />
                  <Button
                    compact
                    label="Change plan"
                    kind="ghost"
                    onPress={() => {
                      setHourDraft(hourPlan.plan);
                      setEditingHour(true);
                    }}
                    style={styles.cell}
                  />
                </View>
              </>
            ) : (
              <>
                <T variant="body" style={{ color: colors.muted }}>
                  What will you do this hour?
                </T>
                <TextInput
                  value={hourDraft}
                  onChangeText={setHourDraft}
                  placeholder="e.g. Draft reply to SCN for client A"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
                <Button
                  label="Plan this hour"
                  kind="soft"
                  disabled={!hourDraft.trim()}
                  onPress={() => {
                    dispatch({ type: 'setHourPlan', key: hKey, plan: hourDraft.trim() });
                    setHourDraft('');
                    setEditingHour(false);
                  }}
                />
              </>
            )}
          </Card>
        </Animated.View>

        {/* Habits row */}
        <Animated.View entering={FadeInDown.delay(180).duration(350)}>
          <SectionTitle
            title="Today's habits"
            hi="आदतें"
            action={
              state.habits.length ? (
                <T variant="caption">
                  {habitsDone}/{state.habits.length} done
                </T>
              ) : null
            }
          />
          {state.habits.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(1.5), paddingRight: space(2) }}>
              {state.habits.map((h) => {
                const st = todayLogs[h.id];
                const done = st === 'done';
                return (
                  <Pressable
                    key={h.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: done }}
                    accessibilityLabel={h.name}
                    onPress={() => {
                      tap(done ? 'light' : 'success');
                      dispatch({ type: 'logHabit', date: today, habitId: h.id, status: done ? undefined : 'done' });
                    }}
                    style={[styles.habit, done && { backgroundColor: colors.primarySoft }]}>
                    <ProgressRing size={58} stroke={5} progress={done ? 1 : st === 'partial' ? 0.5 : 0}>
                      <Text style={{ fontSize: 22 }}>{h.emoji}</Text>
                    </ProgressRing>
                    <T variant="caption" style={{ color: colors.ink, textAlign: 'center' }}>
                      {h.name}
                    </T>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <EmptyState
              emoji="🌱"
              title="Plant your first habit"
              body="Start with one tiny habit you can do even on a bad day."
              action={<Button label="Add a habit" kind="soft" onPress={() => router.push('/habits')} />}
            />
          )}
        </Animated.View>

        {/* Commitments */}
        {openCommitments.length ? (
          <View>
            <SectionTitle title="Pending commitments" />
            <View style={{ gap: space(1) }}>
              {openCommitments.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => dispatch({ type: 'toggleCommitment', id: c.id })}
                  style={styles.commit}
                  accessibilityRole="checkbox">
                  <View style={styles.checkbox} />
                  <T variant="body" style={{ flex: 1 }}>
                    {c.text}
                  </T>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Progress snapshot */}
        <Animated.View entering={FadeInDown.delay(240).duration(350)}>
          <SectionTitle title="Your progress" hi="प्रगति" />
          <View style={styles.row}>
            <Card style={styles.stat}>
              <ProgressRing size={64} progress={(week.pct ?? 0) / 100}>
                <T variant="label" style={{ color: colors.ink, fontSize: 13 }}>
                  {week.pct === null ? '—' : `${week.pct}%`}
                </T>
              </ProgressRing>
              <T variant="caption">Week adherence</T>
              {week.unrecorded ? <T variant="caption">{week.unrecorded} unrecorded</T> : null}
            </Card>
            <Card style={styles.stat}>
              <T variant="number">🔥 {streak}</T>
              <T variant="caption">Day streak</T>
              <T variant="caption" style={{ color: colors.accentText }}>
                ↺ {comebacks} {comebacks === 1 ? 'comeback' : 'comebacks'}
              </T>
            </Card>
            <Card style={styles.stat}>
              <ProgressRing size={64} progress={lv.progress} color={colors.accent} track={colors.accentSoft}>
                <T variant="title">L{lv.lvl}</T>
              </ProgressRing>
              <T variant="caption">{state.xp} XP</T>
            </Card>
          </View>
        </Animated.View>

        {/* Talk to mentor */}
        <Pressable onPress={() => router.push('/mentor')} style={styles.talk} accessibilityRole="button" accessibilityLabel="Talk to Mentor">
          <MentorOrb size={36} />
          <View style={{ flex: 1 }}>
            <T variant="title">Talk to Mentor</T>
            <T variant="caption">"I finished the GST reply and drank two glasses of water."</T>
          </View>
          <Text style={{ fontSize: 22 }}>🎙️</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(1) }}>
          {[
            ['🎙️ Communication Lab', '/comm-lab'],
            ['🎯 Goals', '/goals'],
            ['🗓️ Planner', '/planner'],
            ['💼 Work & Business', '/work'],
            ['💞 Couple Space', '/couple'],
            ['📊 Reports', '/reports'],
          ].map(([x, route]) => (
            <Chip key={x} label={x} onPress={() => router.push(route as never)} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusPill({ status }: { status: HourStatus }) {
  const m = {
    done: { t: 'Done', bg: colors.primarySoft, fg: colors.primaryText },
    partly: { t: 'Partly', bg: colors.accentSoft, fg: colors.accentText },
    missed: { t: 'Missed', bg: '#F6E1DA', fg: colors.firmText },
  }[status];
  return (
    <View style={{ backgroundColor: m.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }}>
      <Text style={{ color: m.fg, fontFamily: fonts.bodySemi, fontSize: 12 }}>{m.t}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space(2.5), paddingBottom: 140, gap: space(3), maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
  moodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -space(1) },
  mood: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: space(2), borderWidth: 1.5, borderColor: colors.accentSoft },
  doneText: { color: colors.muted, textDecorationLine: 'line-through' },
  row: { flexDirection: 'row', gap: space(1.5) },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
  cell: { flexBasis: '48%', flexGrow: 1 },
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
  habit: {
    width: 96,
    alignItems: 'center',
    gap: space(1),
    paddingVertical: space(1.5),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  commit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space(2),
    minHeight: 56,
  },
  checkbox: { width: 22, height: 22, borderRadius: 8, borderWidth: 2, borderColor: colors.primary },
  stat: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: space(1) },
  talk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: space(2),
    minHeight: 72,
  },
});
