import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Bars, HBar } from '@/components/charts';
import { PeopleCard } from '@/components/people-card';
import { PipelineCard } from '@/components/pipeline-card';
import { IconButton, Pill, ScreenHeader, Segmented } from '@/components/kit';
import { Button, Card, Chip, EmptyState, SectionTitle, T, tap } from '@/components/ui';
import { type BizPlan, aiBizPlan } from '@/lib/ai/tasks';
import { explain } from '@/lib/ai/explain';
import {
  delegationAdvice, dueList, growthOf, GROWTH_KINDS, type GrowthKind, TARGET_DEFAULTS, targetsOf, TEMPLATES, TIME_CATEGORIES, timeOf, timeSummary, VENTURES, weekGrowth, weeklyActions,
} from '@/lib/business';
import { liveRows } from '@/lib/collections';
import { dateKey } from '@/lib/metrics';
import { uid, useStore } from '@/lib/store';
import { colors, fonts, radius, space } from '@/theme/tokens';

type Tab = 'growth' | 'time' | 'compliance' | 'plan';

export default function Work() {
  const { state, dispatch } = useStore();
  const today = dateKey();
  const [tab, setTab] = useState<Tab>('growth');
  const [venture, setVenture] = useState<string>(VENTURES[0]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Work & Business" hi="प्रैक्टिस ग्रोथ" left={<IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />} />
        <PipelineCard />
        <PeopleCard />
        <View style={styles.wrap}>
          {VENTURES.map((v) => (
            <Chip key={v} label={v} selected={venture === v} onPress={() => setVenture(v)} />
          ))}
        </View>
        <Segmented<Tab> value={tab} onChange={setTab} options={[{ key: 'growth', label: 'Growth' }, { key: 'time', label: 'Time' }, { key: 'compliance', label: 'Due dates' }, { key: 'plan', label: 'Plan' }]} />
        {tab === 'growth' && <Growth venture={venture} today={today} />}
        {tab === 'time' && <Time venture={venture} today={today} />}
        {tab === 'compliance' && <Compliance today={today} />}
        {tab === 'plan' && <Plan today={today} />}
        <T variant="caption">This is your practice-growth routine, not a client database. Client names you type are masked before anything is sent to AI.</T>
      </ScrollView>
    </SafeAreaView>
  );
}

function Growth({ venture, today }: { venture: string; today: string }) {
  const { state, dispatch } = useStore();
  const [kind, setKind] = useState<GrowthKind>('content');
  const [text, setText] = useState('');
  const all = growthOf(state.collections);
  const wg = weekGrowth(all, today);
  const tg = targetsOf(state.collections);
  const k = GROWTH_KINDS.find((x) => x.key === kind)!;
  const add = () => {
    if (!text.trim()) return;
    tap('success');
    dispatch({ type: 'col/put', table: 'biz_log', row: { id: uid(), kind, text: text.trim().slice(0, 300), venture, date: today } });
    setText('');
  };
  const bump = (key: keyof typeof TARGET_DEFAULTS, d: number) => dispatch({ type: 'col/put', table: 'biz_log', row: { id: 'targets', kind: 'targets', ...tg, [key]: Math.max(0, tg[key] + d), text: '', venture: '', date: today } });
  return (
    <View style={{ gap: space(1.5) }}>
      <Card style={{ gap: space(1.5) }}>
        <SectionTitle title="This week's growth actions" />
        {(['content', 'networking', 'referral'] as const).map((key) => {
          const g = GROWTH_KINDS.find((x) => x.key === key)!;
          return (
            <View key={key} style={{ gap: 6 }}>
              <HBar label={`${g.emoji} ${g.label}`} value={wg[key]} max={Math.max(1, tg[key])} color={wg[key] >= tg[key] ? colors.success : colors.primary} right={`${wg[key]} / ${tg[key]}`} />
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Text style={styles.small}>Weekly target</Text>
                <Chip label="−" onPress={() => bump(key, -1)} />
                <Chip label="+" onPress={() => bump(key, 1)} />
              </View>
            </View>
          );
        })}
      </Card>
      <Card style={{ gap: space(1.25) }}>
        <SectionTitle title="Log an action" />
        <View style={styles.wrap}>
          {GROWTH_KINDS.map((g) => (
            <Chip key={g.key} label={`${g.emoji} ${g.label}`} selected={kind === g.key} onPress={() => setKind(g.key)} />
          ))}
        </View>
        <TextInput value={text} onChangeText={setText} placeholder={k.prompt} placeholderTextColor={colors.muted} style={styles.input} multiline maxLength={300} accessibilityLabel="Growth note" />
        <Button label="Save" disabled={!text.trim()} onPress={add} />
      </Card>
      {all.length === 0 ? (
        <EmptyState emoji="🌱" title="No actions logged yet" body="Small consistent actions (a post, a coffee with a peer, one referral ask) build a practice. Log them here." />
      ) : (
        <View style={{ gap: 8 }}>
          <SectionTitle title="Recent" />
          {all.slice(0, 15).map((e) => {
            const g = GROWTH_KINDS.find((x) => x.key === e.kind);
            return (
              <Card key={e.id} style={{ padding: space(1.75), gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Pill label={`${g?.emoji ?? ''} ${g?.label ?? e.kind}`} tone="sage" />
                  <Text style={styles.small}>{e.date}{e.venture ? ` · ${e.venture}` : ''}</Text>
                </View>
                <T variant="body">{e.text}</T>
                <Text onPress={() => dispatch({ type: 'col/del', table: 'biz_log', id: e.id })} style={[styles.small, { color: colors.firmText, alignSelf: 'flex-end' }]} accessibilityRole="button">
                  Delete
                </Text>
              </Card>
            );
          })}
        </View>
      )}
    </View>
  );
}

function Time({ venture, today }: { venture: string; today: string }) {
  const { state, dispatch } = useStore();
  const [cat, setCat] = useState<string>('client');
  const [mins, setMins] = useState(60);
  const entries = timeOf(state.collections);
  const sum = timeSummary(entries, today, 14);
  const advice = delegationAdvice(sum);
  const hrs = (m: number) => `${Math.round((m / 60) * 10) / 10} h`;
  return (
    <View style={{ gap: space(1.5) }}>
      <Card style={{ gap: space(1.25) }}>
        <SectionTitle title="Log time" />
        <View style={styles.wrap}>
          {TIME_CATEGORIES.map((c) => (
            <Chip key={c.key} label={c.label} selected={cat === c.key} onPress={() => setCat(c.key)} />
          ))}
        </View>
        <View style={styles.wrap}>
          {[15, 30, 60, 90, 120, 180].map((m) => (
            <Chip key={m} label={m >= 60 ? `${m / 60} h` : `${m} m`} selected={mins === m} onPress={() => setMins(m)} />
          ))}
        </View>
        <Button
          label={`Add ${mins >= 60 ? mins / 60 + ' h' : mins + ' min'} to ${venture}`}
          onPress={() => {
            tap('success');
            dispatch({ type: 'col/put', table: 'time_logs', row: { id: uid(), category: cat, minutes: mins, venture, date: today } });
          }}
        />
      </Card>
      {sum.total > 0 ? (
        <Card style={{ gap: space(1.25) }}>
          <SectionTitle title="Last 14 days" action={<Pill label={`${hrs(sum.total)} logged`} tone="sage" />} />
          {sum.by.filter((c) => c.minutes > 0).sort((a, b) => b.minutes - a.minutes).map((c) => (
            <HBar key={c.key} label={c.label + (c.delegable ? '  ↗' : '')} value={c.minutes} max={sum.total} color={c.delegable ? colors.accent : colors.primary} right={`${hrs(c.minutes)} · ${Math.round((c.minutes / sum.total) * 100)}%`} />
          ))}
          <T variant="caption">↗ = work that can often be delegated.</T>
          {sum.byVenture.map((v) => (
            <HBar key={v.venture} label={v.venture} value={v.minutes} max={Math.max(1, sum.total)} color={colors.info} right={hrs(v.minutes)} />
          ))}
        </Card>
      ) : (
        <EmptyState emoji="⏱️" title="No time logged yet" body="Rough minutes are fine. After 3 days you will get delegation advice from your own numbers." />
      )}
      <Card tone="honey" style={{ gap: 6 }}>
        <T variant="label" style={{ color: colors.accentText }}>DELEGATION ADVISOR</T>
        {advice.map((a, i) => (
          <T key={i} variant="body">
            • {a}
          </T>
        ))}
      </Card>
    </View>
  );
}

function Compliance({ today }: { today: string }) {
  const { state, dispatch } = useStore();
  const list = dueList(today, state.collections, 45, 10);
  const off = liveRows(state.collections, 'compliance_items').filter((r) => (r as { off?: boolean }).off).map((r) => r.id.replace('off:', ''));
  const overdue = list.filter((o) => !o.done && o.daysLeft < 0);
  const soon = list.filter((o) => !o.done && o.daysLeft >= 0 && o.daysLeft <= 7);
  const later = list.filter((o) => !o.done && o.daysLeft > 7);
  const done = list.filter((o) => o.done);
  const [manage, setManage] = useState(false);
  const row = (o: (typeof list)[number], tone: 'firm' | 'gold' | 'sand' | 'sage') => (
    <Card key={o.key} style={{ flexDirection: 'row', alignItems: 'center', gap: space(1.5), padding: space(1.75) }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: o.done }}
        accessibilityLabel={`${o.tpl.name} due ${o.due}`}
        onPress={() => {
          tap(o.done ? 'light' : 'success');
          dispatch({ type: 'col/put', table: 'compliance_items', row: { id: o.key, tplId: o.tpl.id, due: o.due, done: !o.done } });
        }}
        style={[styles.box, o.done && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
        {o.done ? <Text style={{ color: '#fff', fontFamily: fonts.bodyBold }}>✓</Text> : null}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cTitle, o.done && { textDecorationLine: 'line-through', color: colors.muted }]}>{o.tpl.name}</Text>
        <Text style={styles.small}>{o.tpl.group} · {o.due}</Text>
      </View>
      <Pill tone={tone} label={o.done ? 'Done' : o.daysLeft < 0 ? `${-o.daysLeft}d over` : o.daysLeft === 0 ? 'Today' : `${o.daysLeft}d`} />
    </Card>
  );
  return (
    <View style={{ gap: space(1.5) }}>
      <Card tone="honey" style={{ gap: 4 }}>
        <T variant="label" style={{ color: colors.accentText }}>PLEASE VERIFY</T>
        <T variant="body">These are the usual statutory dates. Extensions, state-wise schedules and QRMP choices change them often. Always confirm on the official portal before relying on a date.</T>
      </Card>
      {overdue.length ? <><SectionTitle title="Overdue" />{overdue.map((o) => row(o, 'firm'))}</> : null}
      {soon.length ? <><SectionTitle title="Next 7 days" />{soon.map((o) => row(o, 'gold'))}</> : null}
      {later.length ? <><SectionTitle title="Coming up" />{later.map((o) => row(o, 'sand'))}</> : null}
      {!overdue.length && !soon.length && !later.length ? <EmptyState emoji="✅" title="Nothing due soon" body="No tracked due dates in the next 45 days." /> : null}
      {done.length ? <><SectionTitle title="Done" />{done.slice(0, 6).map((o) => row(o, 'sage'))}</> : null}
      <Button kind="ghost" label={manage ? 'Hide list' : 'Choose which due dates to track'} onPress={() => setManage((m) => !m)} />
      {manage ? (
        <Card style={{ gap: 4 }}>
          {TEMPLATES.map((t) => {
            const isOff = off.includes(t.id);
            return (
              <Pressable key={t.id} onPress={() => dispatch({ type: 'col/put', table: 'compliance_items', row: { id: `off:${t.id}`, off: !isOff } })} style={styles.manageRow} accessibilityRole="switch" accessibilityState={{ checked: !isOff }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cTitle}>{t.name}</Text>
                  <Text style={styles.small}>{t.note}</Text>
                </View>
                <Pill label={isOff ? 'Off' : 'Tracking'} tone={isOff ? 'sand' : 'sage'} />
              </Pressable>
            );
          })}
        </Card>
      ) : null}
    </View>
  );
}

function Plan({ today }: { today: string }) {
  const { state } = useStore();
  const [plan, setPlan] = useState<BizPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const actions = weeklyActions(today, state.collections);
  const month = timeSummary(timeOf(state.collections), today, 30);
  const g30 = growthOf(state.collections).filter((e) => e.date >= new Date(Date.parse(`${today}T12:00:00+05:30`) - 30 * 86400000).toISOString().slice(0, 10));
  const ask = async () => {
    setBusy(true);
    setErr(undefined);
    const r = await aiBizPlan(state);
    setBusy(false);
    if (r.ok) setPlan(r.data);
    else setErr(explain(r.code === 'crisis' ? 'ai_unavailable' : r.code, state.profile.language));
  };
  return (
    <View style={{ gap: space(1.5) }}>
      <Card tone="sage" style={{ gap: 6 }}>
        <T variant="label">THIS WEEK'S ACTION PLAN (from your numbers)</T>
        {actions.map((a, i) => (
          <T key={i} variant="body">
            {i + 1}. {a}
          </T>
        ))}
      </Card>
      <Button kind="soft" label="Ask Krishna for a sharper plan" loading={busy} onPress={ask} />
      {err ? <T variant="body" style={{ color: colors.firmText }}>{err}</T> : null}
      {plan ? (
        <Card style={{ gap: 8 }}>
          <T variant="label">KRISHNA'S FOCUS</T>
          <T variant="title">{plan.focus}</T>
          {plan.actions.map((a, i) => (
            <View key={i}>
              <T variant="body">{i + 1}. {a.text}</T>
              <T variant="caption">Why: {a.why}</T>
            </View>
          ))}
        </Card>
      ) : null}
      <Card style={{ gap: space(1.25) }}>
        <SectionTitle title="Monthly review (30 days)" />
        <View style={{ flexDirection: 'row', gap: space(1.5) }}>
          <Stat n={g30.filter((e) => e.kind === 'content').length} l="Content" />
          <Stat n={g30.filter((e) => e.kind === 'networking').length} l="Networking" />
          <Stat n={g30.filter((e) => e.kind === 'referral').length} l="Referral asks" />
          <Stat n={g30.filter((e) => e.kind === 'win').length} l="Wins" />
        </View>
        <T variant="body">
          Time logged: {Math.round((month.total / 60) * 10) / 10} h{month.total ? `, of which ${Math.round((month.delegable / month.total) * 100)}% was delegable and ${Math.round((month.bd / month.total) * 100)}% went to business development.` : '. Log time to see your split.'}
        </T>
        <Bars color={colors.primary} items={month.byVenture.map((v) => ({ label: v.venture.split(' ')[0], value: Math.round(v.minutes / 60) }))} suffix="h" height={60} />
      </Card>
    </View>
  );
}

const Stat = ({ n, l }: { n: number; l: string }) => (
  <View style={{ flex: 1, alignItems: 'center' }}>
    <Text style={{ fontFamily: fonts.displayBold, fontSize: 24, color: colors.ink }}>{n}</Text>
    <Text style={styles.small}>{l}</Text>
  </View>
);

const styles = StyleSheet.create({
  scroll: { padding: space(2.5), paddingBottom: space(6), gap: space(1.75), maxWidth: 640, width: '100%', alignSelf: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  small: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  cTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  input: { minHeight: 70, textAlignVertical: 'top', borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.hairline, padding: space(1.75), fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  box: { width: 28, height: 28, borderRadius: 10, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  manageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, paddingVertical: 4 },
});
