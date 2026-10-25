// Couple Space: "Aaj ka summary" for both partners, and "push each other". Summary is shared only after the person turns it on
// in Settings. Pushes are short notes; the partner sees them here and (when server nudges are on) as a notification.
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, T, tap } from '@/components/ui';
import { configOf } from '@/lib/discipline';
import { dayStats } from '@/lib/day-stats';
import { dateKey } from '@/lib/metrics';
import { say } from '@/lib/nudges';
import { PUSHES, isSummary, summaryId, summaryLine, type DailySummary } from '@/lib/summary';
import { useStore } from '@/lib/store';
import type { useCouple } from '@/lib/couple';
import { colors, radius, space } from '@/theme/tokens';

export function CoupleSummary({ c }: { c: ReturnType<typeof useCouple> }) {
  const { state } = useStore();
  const cfg = configOf(state.collections);
  const today = dateKey();
  const me = c.me ?? '';
  const stats = dayStats(state, today);
  const lang = cfg.nudgeLang;
  const sent = useRef('');
  const [custom, setCustom] = useState('');

  // Post (or refresh) my summary for today when sharing is on. Only posts again if the numbers changed.
  const mine: DailySummary = { type: 'daily_summary', date: today, score: stats.score.score, water: `${stats.water}/${stats.waterTarget}`, oneThingDone: stats.oneThingDone, habits: `${stats.habitsDone}/${stats.habitsTotal}`, detoxFree: stats.detoxFree, woke: stats.woke };
  const sig = JSON.stringify(mine);
  useEffect(() => {
    if (!cfg.shareSummary || !c.couple || c.couple.status !== 'active' || !me || sent.current === sig) return;
    sent.current = sig;
    c.post('checkin', { ...mine }, summaryId(me, today));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.shareSummary, sig, c.couple?.id]);

  const summaries = c.items.filter((i) => i.kind === 'checkin' && isSummary(i.data));
  const partner = summaries.filter((i) => i.author !== me).sort((a, b) => String(b.data.date).localeCompare(String(a.data.date)))[0];
  const pushes = c.items.filter((i) => i.kind === 'note' && i.data.type === 'push' && i.author !== me).slice(0, 3);
  const sendPush = async (text: string) => {
    tap('success');
    await c.post('note', { type: 'push', text, date: today });
  };
  const list = PUSHES[cfg.role];

  return (
    <View style={{ gap: space(1.5) }}>
      <Card tone="sage" style={{ gap: 6 }}>
        <T variant="label">AAJ KA SUMMARY · {c.partner.toUpperCase()}</T>
        {partner && isSummary(partner.data) ? (
          <>
            <T variant="body">{say(summaryLine(partner.data, c.partner), lang)}</T>
            <T variant="caption">{partner.data.date === today ? 'Aaj ka' : `Aakhri summary: ${partner.data.date}`}</T>
          </>
        ) : (
          <T variant="caption">{c.partner} ne abhi summary share nahi kiya. Dono apne Settings mein share chalu karein.</T>
        )}
        <T variant="caption">Aapka summary {cfg.shareSummary ? 'share ho raha hai.' : 'share nahi ho raha (Settings → Discipline).'}</T>
      </Card>

      {pushes.length ? (
        <Card tone="honey" style={{ gap: 4 }}>
          <T variant="label" style={{ color: colors.accentText }}>{c.partner.toUpperCase()} NE PUSH KIYA</T>
          {pushes.map((p) => <T key={p.id} variant="body">💪 {String(p.data.text)}</T>)}
        </Card>
      ) : null}

      <Card style={{ gap: 8 }}>
        <T variant="label">{c.partner.toUpperCase()} KO PUSH KARO</T>
        {list.map((m) => <Button key={m.id} compact kind="soft" label={say(m.text, lang === 'both' ? 'en' : lang)} onPress={() => sendPush(say(m.text, lang))} />)}
        <View style={s.row}>
          <TextInput value={custom} onChangeText={setCustom} placeholder="Apna message" placeholderTextColor={colors.muted} style={[s.input, { flex: 1 }]} maxLength={140} />
          <Button compact kind="gold" label="Push" disabled={!custom.trim()} onPress={async () => { await sendPush(custom.trim()); setCustom(''); }} />
        </View>
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
  input: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.sm, padding: space(1.5), color: colors.ink, backgroundColor: colors.surface },
});
