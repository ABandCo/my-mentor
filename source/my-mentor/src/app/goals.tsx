import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton, Pill, ProgressBar, ScreenHeader, Segmented, Sheet } from '@/components/kit';
import { Button, Card, Chip, EmptyState, T } from '@/components/ui';
import { aiGoalPlan, type GoalPlan } from '@/lib/ai/tasks';
import { explain } from '@/lib/ai/explain';
import { AREAS, type Goal, type Horizon, HORIZONS, daysLeft, flatten, goalsOf, paceOf, windowFor } from '@/lib/goals';
import { dateKey } from '@/lib/metrics';
import { uid, useStore } from '@/lib/store';
import { colors, fonts, radius, space } from '@/theme/tokens';

const PACE: Record<string, { label: string; tone: 'sage' | 'gold' | 'firm' | 'sand' }> = {
  done: { label: 'Done', tone: 'sage' },
  on_track: { label: 'On track', tone: 'sage' },
  behind: { label: 'Behind pace', tone: 'gold' },
  overdue: { label: 'Overdue', tone: 'firm' },
  no_dates: { label: 'No date', tone: 'sand' },
};

export default function Goals() {
  const { state, dispatch } = useStore();
  const today = dateKey();
  const all = goalsOf(state.collections);
  const [filter, setFilter] = useState<'all' | Horizon>('all');
  const [form, setForm] = useState<{ open: boolean; parent?: Goal; edit?: Goal }>({ open: false });
  const [open, setOpen] = useState<string | null>(null);

  const list = flatten(all).filter(({ goal }) => filter === 'all' || goal.horizon === filter);
  const counts = { total: all.length, done: all.filter((g) => g.status === 'done').length, behind: all.filter((g) => g.status === 'active' && ['behind', 'overdue'].includes(paceOf(g, all.filter((x) => x.status === 'active'), today).pace)).length };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Goals" hi="लक्ष्य" left={<IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />} right={<IconButton icon="add" label="Add goal" tone="primary" onPress={() => setForm({ open: true })} />} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Pill label={`${counts.total} goals`} tone="sand" />
          <Pill label={`${counts.done} done`} tone="sage" />
          {counts.behind ? <Pill label={`${counts.behind} behind pace`} tone="gold" /> : null}
        </View>
        <Segmented<'all' | Horizon>
          value={filter}
          onChange={setFilter}
          options={[{ key: 'all', label: 'All' }, ...HORIZONS.map((h) => ({ key: h, label: h[0].toUpperCase() + h.slice(1) }))]}
        />

        {all.length === 0 ? (
          <EmptyState emoji="🎯" title="No goals yet" body="Start with one yearly goal, then break it into quarters, months and weeks. Krishna can help break it down." action={<Button label="Add your first goal" onPress={() => setForm({ open: true })} />} />
        ) : (
          list.map(({ goal: g, depth }) => {
            const activeAll = all.filter((x) => x.status === 'active');
            const p = paceOf(g, activeAll.length ? activeAll : all, today);
            const a = AREAS.find((x) => x.key === g.area);
            const dl = daysLeft(g, today);
            const isOpen = open === g.id;
            return (
              <Card key={g.id} style={[{ marginLeft: Math.min(depth, 3) * 14, gap: space(1) }, g.status === 'done' && { opacity: 0.7 }]}>
                <Text onPress={() => setOpen(isOpen ? null : g.id)} accessibilityRole="button" accessibilityLabel={`${g.title}, ${Math.round(p.progress * 100)} percent`} style={styles.title}>
                  {a?.emoji ?? '🎯'}  {g.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ProgressBar value={p.progress} color={p.pace === 'behind' || p.pace === 'overdue' ? colors.attention : colors.primary} height={10} />
                  <Text style={styles.pct}>{Math.round(p.progress * 100)}%</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <Pill label={PACE[p.pace].label} tone={PACE[p.pace].tone} />
                  <Pill label={g.horizon} tone="sand" />
                  {dl !== null && g.status !== 'done' ? <Pill label={dl >= 0 ? `${dl} days left` : `${-dl} days over`} tone={dl < 0 ? 'firm' : 'sand'} /> : null}
                  {g.target ? <Pill label={`${g.current ?? 0}/${g.target}${g.unit ? ' ' + g.unit : ''}`} tone="sky" /> : null}
                </View>
                {isOpen ? (
                  <View style={{ gap: 8 }}>
                    {g.why ? <T variant="body" style={{ color: colors.muted }}>Why: {g.why}</T> : null}
                    {g.target ? (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Button compact kind="soft" label="− 1" style={{ flex: 1 }} onPress={() => dispatch({ type: 'col/put', table: 'goals', row: { id: g.id, current: Math.max(0, (g.current ?? 0) - 1) } })} />
                        <Button compact kind="soft" label="+ 1" style={{ flex: 1 }} onPress={() => dispatch({ type: 'col/put', table: 'goals', row: { id: g.id, current: (g.current ?? 0) + 1 } })} />
                      </View>
                    ) : null}
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      <Button compact kind={g.status === 'done' ? 'ghost' : 'primary'} label={g.status === 'done' ? 'Reopen' : 'Mark done'} onPress={() => dispatch({ type: 'col/put', table: 'goals', row: { id: g.id, status: g.status === 'done' ? 'active' : 'done' } })} />
                      <Button compact kind="soft" label="Add sub-goal" onPress={() => setForm({ open: true, parent: g })} />
                      <Button compact kind="ghost" label="Edit" onPress={() => setForm({ open: true, edit: g })} />
                      <Button compact kind="firm" label="Delete" onPress={() => dispatch({ type: 'col/del', table: 'goals', id: g.id })} />
                    </View>
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
        <T variant="caption">Progress of a goal with sub-goals is the average of its sub-goals. Pace compares your progress with the share of time used.</T>
      </ScrollView>
      <GoalForm state={state} open={form.open} parent={form.parent} edit={form.edit} onClose={() => setForm({ open: false })} />
    </SafeAreaView>
  );
}

function GoalForm({ state, open, parent, edit, onClose }: { state: ReturnType<typeof useStore>['state']; open: boolean; parent?: Goal; edit?: Goal; onClose: () => void }) {
  const { dispatch } = useStore();
  const today = dateKey();
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('practice');
  const [horizon, setHorizon] = useState<Horizon>('month');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [why, setWhy] = useState('');
  const [due, setDue] = useState('');
  const [plan, setPlan] = useState<GoalPlan | null>(null);
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState<string | undefined>();

  const key = `${open}-${parent?.id}-${edit?.id}`;
  if (open && seen !== key) {
    setSeen(key);
    setTitle(edit?.title ?? '');
    setArea(edit?.area ?? parent?.area ?? 'practice');
    setHorizon(edit?.horizon ?? (parent ? HORIZONS[Math.min(3, HORIZONS.indexOf(parent.horizon) + 1)] : 'month'));
    setTarget(edit?.target ? String(edit.target) : '');
    setUnit(edit?.unit ?? '');
    setWhy(edit?.why ?? '');
    setDue(edit?.due ?? '');
    setPlan(null);
    setErr(undefined);
  }
  if (!open && seen) setSeen(undefined);

  const w = windowFor(horizon, today);
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : w.due;

  const save = () => {
    const id = edit?.id ?? uid();
    dispatch({
      type: 'col/put',
      table: 'goals',
      row: { id, title: title.trim().slice(0, 120), area, horizon, parentId: edit ? edit.parentId ?? null : parent?.id ?? null, target: Number(target) > 0 ? Number(target) : null, unit: unit.trim() || undefined, current: edit?.current ?? 0, start: edit?.start ?? w.start, due: dueDate, status: edit?.status ?? 'active', why: why.trim().slice(0, 200) || undefined },
    });
    if (plan && !edit) {
      // Milestones the user accepted become sub-goals one horizon down.
      const sub = HORIZONS[Math.min(3, HORIZONS.indexOf(horizon) + 1)];
      let cum = 0;
      for (const m of plan.milestones) {
        cum += m.weeks;
        const d = new Date(new Date(`${w.start}T12:00:00+05:30`).getTime() + cum * 7 * 86400000).toISOString().slice(0, 10);
        dispatch({ type: 'col/put', table: 'goals', row: { id: uid(), title: m.title, area, horizon: sub, parentId: id, start: w.start, due: d > dueDate ? dueDate : d, status: 'active', current: 0 } });
      }
    }
    onClose();
  };

  const ask = async () => {
    setBusy(true);
    setErr(undefined);
    const r = await aiGoalPlan(state, title.trim(), why.trim(), w.start, dueDate);
    setBusy(false);
    if (r.ok) setPlan(r.data);
    else setErr(r.code === 'crisis' ? 'Please talk to someone you trust. If you feel unsafe call 112 or Tele-MANAS 14416.' : explain(r.code, state.profile.language));
  };

  return (
    <Sheet visible={open} onClose={onClose} title={edit ? 'Edit goal' : parent ? `Sub-goal of "${parent.title.slice(0, 28)}"` : 'New goal'}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: space(1.5), paddingBottom: space(2) }}>
        <TextInput value={title} onChangeText={setTitle} placeholder="What do you want to achieve?" placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel="Goal title" maxLength={120} />
        <T variant="label">Area</T>
        <View style={styles.wrap}>
          {AREAS.map((a) => (
            <Chip key={a.key} label={`${a.emoji} ${a.label}`} selected={area === a.key} onPress={() => setArea(a.key)} />
          ))}
        </View>
        <T variant="label">Time frame</T>
        <View style={styles.wrap}>
          {HORIZONS.map((h) => (
            <Chip key={h} label={h} selected={horizon === h} onPress={() => setHorizon(h)} />
          ))}
        </View>
        <T variant="label">Due date (optional, YYYY-MM-DD). Default: {w.due}</T>
        <TextInput value={due} onChangeText={setDue} placeholder={w.due} placeholderTextColor={colors.muted} style={styles.input} maxLength={10} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={target} onChangeText={setTarget} placeholder="Target number" keyboardType="numeric" placeholderTextColor={colors.muted} style={[styles.input, { flex: 1 }]} />
          <TextInput value={unit} onChangeText={setUnit} placeholder="Unit (clients, kg…)" placeholderTextColor={colors.muted} style={[styles.input, { flex: 1 }]} maxLength={16} />
        </View>
        <TextInput value={why} onChangeText={setWhy} placeholder="Why does it matter to you?" placeholderTextColor={colors.muted} style={styles.input} maxLength={200} />

        {!edit && title.trim().length > 3 ? <Button compact kind="soft" label={busy ? 'Thinking…' : 'Ask Krishna to break it down'} loading={busy} onPress={ask} /> : null}
        {err ? <T variant="body" style={{ color: colors.firmText }}>{err}</T> : null}
        {plan ? (
          <Card tone="sage" style={{ gap: 6 }}>
            <T variant="label">KRISHNA'S BREAKDOWN (added as sub-goals when you save)</T>
            {plan.milestones.map((m, i) => (
              <T key={i} variant="body">
                {i + 1}. {m.title} <Text style={{ color: colors.muted }}>({m.weeks} wk)</Text>
              </T>
            ))}
            {plan.firstStep ? <T variant="title">First step: {plan.firstStep}</T> : null}
            <Button compact kind="ghost" label="Discard breakdown" onPress={() => setPlan(null)} />
          </Card>
        ) : null}
        <Button label={edit ? 'Save changes' : 'Add goal'} disabled={title.trim().length < 3} onPress={save} />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space(2.5), paddingBottom: space(6), gap: space(1.5), maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, lineHeight: 22 },
  pct: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted, width: 40, textAlign: 'right' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.hairline, paddingHorizontal: space(2), fontFamily: fonts.body, fontSize: 16, color: colors.ink },
});
