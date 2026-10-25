import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { HBar } from '@/components/charts';
import { IconButton, Pill, ProgressBar, ScreenHeader, Segmented, Sheet, StatTile } from '@/components/kit';
import { Button, Card, ProgressRing, SectionTitle, T } from '@/components/ui';
import { configOf, detoxStreak, waterStreak, waterTotals } from '@/lib/discipline';
import { spentVsBuilt, timeOf } from '@/lib/business';
import { dateKey, level } from '@/lib/metrics';
import { buildReport, reportHtml, type ReportKind } from '@/lib/reports';
import { BADGES, earnedKeys, newlyEarned, weeklyWins } from '@/lib/rewards';
import { useStore } from '@/lib/store';
import { colors, fonts, space } from '@/theme/tokens';

export default function Reports() {
  const { state, dispatch } = useStore();
  const today = dateKey();
  const [kind, setKind] = useState<ReportKind>('weekly');
  const [how, setHow] = useState(false);
  const [msg, setMsg] = useState<string>();
  const winsRef = useRef<ComponentRef<typeof View>>(null);
  const r = useMemo(() => buildReport(state, kind), [state, kind]);
  const wins = weeklyWins(state, today);
  const lv = level(state.xp);
  const have = new Set(earnedKeys(state, today));

  // Store newly earned badges once (earned stays earned).
  useEffect(() => {
    if (!state.hydrated) return;
    for (const b of newlyEarned(state, today)) dispatch({ type: 'col/put', table: 'badges', row: { id: b.key, earnedAt: new Date().toISOString() } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hydrated, state.habitLogs, state.hours, state.oneThing]);
  const storedKeys = new Set(Object.values(state.collections.badges ?? {}).filter((x) => !x.deletedAt).map((x) => x.id));
  const isEarned = (k: string) => have.has(k) || storedKeys.has(k);

  const exportPdf = async () => {
    setMsg(undefined);
    try {
      const html = reportHtml(r, state.name);
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: r.title, UTI: 'com.adobe.pdf' });
      else setMsg(`Saved: ${uri}`);
    } catch {
      setMsg('Could not create the PDF on this device.');
    }
  };
  const shareWins = async () => {
    setMsg(undefined);
    try {
      const uri = await captureRef(winsRef, { format: 'png', quality: 1 });
      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'My weekly wins' });
      else if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = uri;
        a.download = 'weekly-wins.png';
        a.click();
      }
    } catch {
      setMsg('Could not make the picture on this device.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Reports" hi="रिपोर्ट" left={<IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />} />

        {/* Level + XP */}
        <Card tone="honey" style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
          <ProgressRing size={76} stroke={8} progress={lv.progress} color={colors.accent} track="#fff">
            <Text style={styles.lv}>L{lv.lvl}</Text>
          </ProgressRing>
          <View style={{ flex: 1, gap: 4 }}>
            <T variant="title">{state.xp} XP</T>
            <ProgressBar value={lv.progress} color={colors.accent} track="#fff" height={10} />
            <T variant="caption">{lv.toNext} XP to level {lv.lvl + 1}. XP comes from logging and finishing, never from opening the app, and is never taken away for a miss.</T>
          </View>
        </Card>

        {/* Weekly wins card (shareable) */}
        <View ref={winsRef} collapsable={false} style={styles.wins}>
          <Text style={styles.winsKicker}>MY WEEK · {today}</Text>
          <Text style={styles.winsTitle}>{state.name ? `${state.name}'s weekly wins` : 'Weekly wins'}</Text>
          <View style={styles.winsGrid}>
            <Win n={wins.adherencePct === null ? '—' : `${wins.adherencePct}%`} l="Habit rate" />
            <Win n={String(wins.habitDone)} l="Habits done" />
            <Win n={String(wins.oneThingDone)} l="One Things" />
            <Win n={`🔥${wins.streak}`} l="Day streak" />
            <Win n={String(wins.hoursAnswered)} l="Honest hours" />
            <Win n={String(wins.commAttempts)} l="Practice rounds" />
          </View>
          <Text style={styles.winsFoot}>{wins.comebacks ? `↺ ${wins.comebacks} comeback${wins.comebacks > 1 ? 's' : ''}  ·  ` : ''}Level {wins.level}</Text>
        </View>
        <Button kind="soft" label="Share my Weekly Wins picture" onPress={shareWins} />

        <Segmented<ReportKind> value={kind} onChange={setKind} options={[{ key: 'weekly', label: 'Weekly' }, { key: 'monthly', label: 'Monthly' }, { key: 'thirty', label: '30-day review' }]} />
        <T variant="caption">{r.from} to {r.to} · India time</T>

        <View style={styles.grid}>
          {r.headline.map((h) => (
            <View key={h.label} style={{ flexBasis: '47%', flexGrow: 1 }}>
              <StatTile value={h.value} label={h.label} sub={h.note} tone="surface" />
            </View>
          ))}
        </View>

        <Card tone="sage" style={{ gap: 6 }}>
          <T variant="label">WHAT STANDS OUT</T>
          {r.insights.map((i, k) => (
            <T key={k} variant="body">• {i}</T>
          ))}
        </Card>

        {r.habits.length ? (
          <Card style={{ gap: space(1.25) }}>
            <Card style={{ gap: 6 }}>
              <T variant="label">PAANI · DETOX</T>
              <T variant="body">💧 Is hafte {waterTotals(state.collections, today).week} glass · 30 din mein {waterTotals(state.collections, today).month}</T>
              <T variant="caption">Water streak {waterStreak(state.collections, configOf(state.collections).waterTarget, today)} din · Detox-free streak {detoxStreak(state.collections, today)} din</T>
            </Card>
            {(() => {
              const sb = spentVsBuilt(timeOf(state.collections), today, 7);
              const h = (m: number) => `${Math.round((m / 60) * 10) / 10} h`;
              return (
                <Card style={{ gap: 6 }}>
                  <T variant="label">SPENT VS BUILT · 7 DIN</T>
                  {sb.total === 0 ? (
                    <T variant="caption">Time log nahi bhara. Work & Business mein minutes daalo.</T>
                  ) : (
                    <>
                      <HBar label="Billable" value={sb.billable} max={sb.total} color={colors.primary} right={h(sb.billable)} />
                      <HBar label="Building" value={sb.building} max={sb.total} color={colors.accent} right={h(sb.building)} />
                      <HBar label="Drain" value={sb.drain} max={sb.total} color={colors.firm} right={h(sb.drain)} />
                      <T variant="caption">Billable {h(sb.billable)} · Building {h(sb.building)} ({sb.buildPct}%) · Drain {h(sb.drain)}</T>
                      {sb.advisingOverCap ? <T variant="caption" style={{ color: colors.firmText }}>Doosron ko advise/motivate karne mein {sb.advisingPct}% time gaya (cap 20%). Isse ghatao: pehle apna kaam.</T> : null}
                    </>
                  )}
                </Card>
              );
            })()}
            <SectionTitle title="Habits" />
            {r.habits.map((h) => (
              <HBar key={h.name} label={`${h.emoji}  ${h.name}`} value={h.pct ?? 0} color={colors.primary} right={h.pct === null ? 'no data' : `${h.pct}% · ${h.done}/${h.eligible}`} />
            ))}
          </Card>
        ) : null}

        {r.goals.length ? (
          <Card style={{ gap: space(1.25) }}>
            <SectionTitle title="Goals" />
            {r.goals.map((g) => (
              <HBar key={g.title} label={g.title} value={g.progressPct} color={g.pace === 'behind' || g.pace === 'overdue' ? colors.attention : colors.primary} right={`${g.progressPct}% · ${g.pace}`} />
            ))}
          </Card>
        ) : null}

        <Card style={{ flexDirection: 'row', gap: space(1.5) }}>
          <StatTile tone="sand" value={String(r.comm.attempts)} label="Practice rounds" sub={r.comm.avg === null ? undefined : `avg ${r.comm.avg}%`} />
          <StatTile tone="sand" value={`${r.hours.done}/${r.hours.done + r.hours.partly + r.hours.missed}`} label="Hours done" sub={`${r.hours.unanswered} unanswered`} />
        </Card>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button style={{ flex: 1 }} label="Export PDF" onPress={exportPdf} />
          <Button style={{ flex: 1 }} kind="ghost" label="How calculated" onPress={() => setHow(true)} />
        </View>
        {msg ? <T variant="body" style={{ color: colors.firmText }}>{msg}</T> : null}

        {/* Badges */}
        <SectionTitle title="Badges" action={<Pill label={`${BADGES.filter((b) => isEarned(b.key)).length}/${BADGES.length}`} tone="gold" />} />
        <View style={styles.grid}>
          {BADGES.map((b) => {
            const on = isEarned(b.key);
            return (
              <View key={b.key} style={[styles.badge, on ? { backgroundColor: colors.accentSoft } : { backgroundColor: colors.surfaceAlt, opacity: 0.75 }]} accessible accessibilityLabel={`${b.title}. ${on ? 'Earned' : 'Not yet'}. ${b.how}`}>
                <Text style={{ fontSize: 28, opacity: on ? 1 : 0.35 }}>{b.emoji}</Text>
                <Text style={styles.bt}>{b.title}</Text>
                <Text style={styles.bh}>{on ? 'Earned' : b.how}</Text>
              </View>
            );
          })}
        </View>
        <T variant="caption">Streak shield: one missed day in any 7 is forgiven. Comeback badge: returning after a quiet stretch is rewarded, because that is the hard part.</T>
      </ScrollView>

      <Sheet visible={how} onClose={() => setHow(false)} title="How this is calculated">
        <ScrollView style={{ maxHeight: 420 }}>
          {r.how.map((h, i) => (
            <T key={i} variant="body" style={{ marginBottom: 10 }}>{h}</T>
          ))}
        </ScrollView>
      </Sheet>
    </SafeAreaView>
  );
}

const Win = ({ n, l }: { n: string; l: string }) => (
  <View style={styles.win}>
    <Text style={styles.winN}>{n}</Text>
    <Text style={styles.winL}>{l}</Text>
  </View>
);

const styles = StyleSheet.create({
  scroll: { padding: space(2.5), paddingBottom: space(6), gap: space(2), maxWidth: 640, width: '100%', alignSelf: 'center' },
  lv: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.ink },
  wins: { backgroundColor: colors.primary, borderRadius: 28, padding: space(3), gap: space(1.5) },
  winsKicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, color: '#DCEBE0' },
  winsTitle: { fontFamily: fonts.display, fontSize: 26, color: '#fff' },
  winsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  win: { flexBasis: '30%', flexGrow: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 18, padding: 12, alignItems: 'center' },
  winN: { fontFamily: fonts.displayBold, fontSize: 24, color: '#fff' },
  winL: { fontFamily: fonts.bodyMedium, fontSize: 11, color: '#DCEBE0', textAlign: 'center' },
  winsFoot: { fontFamily: fonts.bodySemi, fontSize: 13, color: '#F6E3B4' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5) },
  badge: { flexBasis: '30%', flexGrow: 1, borderRadius: 20, padding: 12, alignItems: 'center', gap: 4, minHeight: 130 },
  bt: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink, textAlign: 'center' },
  bh: { fontFamily: fonts.body, fontSize: 10.5, color: colors.muted, textAlign: 'center' },
});
