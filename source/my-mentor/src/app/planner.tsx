import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, IconButton, Pill, ScreenHeader, Sheet } from '@/components/kit';
import { Button, Card, Chip, EmptyState, SectionTitle, T, tap } from '@/components/ui';
import { liveRows, type Row } from '@/lib/collections';
import { goalsOf } from '@/lib/goals';
import { isScheduled } from '@/lib/habit-stats';
import { habitsWithMeta } from '@/lib/habits';
import { dateKey, lastNDates } from '@/lib/metrics';
import { uid, useStore } from '@/lib/store';
import { colors, fonts, radius, space } from '@/theme/tokens';

type Item = Row & { title: string; date: string; time?: string; done?: boolean; remindMin?: number; note?: string };
const shift = (d: string, n: number) => new Date(new Date(`${d}T12:00:00+05:30`).getTime() + n * 86400000).toISOString().slice(0, 10);
const label = (d: string, today: string) => (d === today ? 'Today' : d === shift(today, 1) ? 'Tomorrow' : d === shift(today, -1) ? 'Yesterday' : new Date(`${d}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }));

export default function Planner() {
  const { state, dispatch } = useStore();
  const today = dateKey();
  const [day, setDay] = useState(today);
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState<Item | null>(null);

  const items = liveRows<Item>(state.collections, 'planner_items', 'date');
  const mine = items.filter((i) => i.date === day).sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
  const hs = habitsWithMeta(state).filter((h) => isScheduled(h, day));
  const goalsDue = goalsOf(state.collections).filter((g) => g.status === 'active' && g.due === day);
  const strip = lastNDates(7, new Date(new Date(`${day}T12:00:00+05:30`).getTime() + 3 * 86400000));
  const openCount = (d: string) => items.filter((i) => i.date === d && !i.done).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Planner" hi="दिनचर्या" left={<IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />} right={<IconButton icon="add" label="Add to plan" tone="primary" onPress={() => { setEdit(null); setAdding(true); }} />} />

        <View style={styles.strip}>
          <IconButton icon="chevron-back" label="Previous day" onPress={() => setDay(shift(day, -1))} />
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
            {strip.map((d) => (
              <Pressable key={d} onPress={() => setDay(d)} accessibilityRole="button" accessibilityLabel={label(d, today)} style={[styles.sd, d === day && { backgroundColor: colors.primary }]}>
                <Text style={[styles.sdw, d === day && { color: '#fff' }]}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(`${d}T12:00:00+05:30`).getUTCDay()]}</Text>
                <Text style={[styles.sdn, d === day && { color: '#fff' }]}>{Number(d.slice(8))}</Text>
                {openCount(d) > 0 ? <View style={[styles.dot, d === day && { backgroundColor: '#fff' }]} /> : <View style={{ height: 6 }} />}
              </Pressable>
            ))}
          </View>
          <IconButton icon="chevron-forward" label="Next day" onPress={() => setDay(shift(day, 1))} />
        </View>

        <SectionTitle title={label(day, today)} action={day !== today ? <Chip label="Today" onPress={() => setDay(today)} /> : undefined} />

        {mine.length === 0 ? (
          <EmptyState emoji="🗓️" title="Nothing planned" body="Add the few things that matter. A timed item gets a reminder before it starts." action={<Button label="Add to plan" onPress={() => { setEdit(null); setAdding(true); }} />} />
        ) : (
          mine.map((i) => (
            <Card key={i.id} style={styles.item}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !!i.done }}
                accessibilityLabel={`${i.title}${i.done ? ', done' : ''}`}
                onPress={() => {
                  tap(i.done ? 'light' : 'success');
                  dispatch({ type: 'col/put', table: 'planner_items', row: { id: i.id, done: !i.done } });
                }}
                style={[styles.box, i.done && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                {i.done ? <Icon name="checkmark" size={18} color="#fff" /> : null}
              </Pressable>
              <Pressable style={{ flex: 1 }} onPress={() => { setEdit(i); setAdding(true); }} accessibilityRole="button" accessibilityLabel={`Edit ${i.title}`}>
                <Text style={[styles.itemTitle, i.done && { textDecorationLine: 'line-through', color: colors.muted }]}>{i.title}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {i.time ? <Pill label={`${i.time}${i.remindMin ? ` · remind ${i.remindMin}m before` : ''}`} tone="sky" icon="time-outline" /> : <Pill label="Any time" tone="sand" />}
                </View>
              </Pressable>
            </Card>
          ))
        )}

        {goalsDue.length ? (
          <Card tone="honey" style={{ gap: 4 }}>
            <T variant="label">GOALS DUE THIS DAY</T>
            {goalsDue.map((g) => (
              <T key={g.id} variant="title">
                🎯 {g.title}
              </T>
            ))}
          </Card>
        ) : null}

        {hs.length ? (
          <View style={{ gap: 8 }}>
            <SectionTitle title="Habits scheduled" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {hs.map((h) => (
                <Pill key={h.id} label={`${h.emoji} ${h.name}${h.reminder ? ` · ${h.reminder}` : ''}`} tone="sage" />
              ))}
            </View>
          </View>
        ) : null}

        <Button kind="soft" label="Ask Krishna to plan my day" onPress={() => router.push('/mentor')} />
      </ScrollView>
      <ItemForm open={adding} onClose={() => setAdding(false)} day={day} edit={edit} />
    </SafeAreaView>
  );
}

function ItemForm({ open, onClose, day, edit }: { open: boolean; onClose: () => void; day: string; edit: Item | null }) {
  const { dispatch } = useStore();
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [remind, setRemind] = useState(15);
  const [seen, setSeen] = useState<string | undefined>();
  const key = open ? `${edit?.id ?? 'new'}-${day}` : undefined;
  if (key !== seen) {
    setSeen(key);
    if (open) {
      setTitle(edit?.title ?? '');
      setTime(edit?.time ?? '');
      setRemind(edit?.remindMin ?? 15);
    }
  }
  const okTime = time === '' || /^([01]?\d|2[0-3]):[0-5]\d$/.test(time);
  const norm = (t: string) => (t.length === 4 ? `0${t}` : t);
  return (
    <Sheet visible={open} onClose={onClose} title={edit ? 'Edit item' : 'Add to plan'}>
      <View style={{ gap: space(1.5) }}>
        <TextInput value={title} onChangeText={setTitle} placeholder="What needs to happen?" placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel="Plan item" maxLength={120} autoFocus />
        <TextInput value={time} onChangeText={setTime} placeholder="Time, optional (HH:MM, 24-hour)" placeholderTextColor={colors.muted} style={[styles.input, !okTime && { borderColor: colors.firm }]} maxLength={5} />
        {time ? (
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {[0, 5, 15, 30, 60].map((m) => (
              <Chip key={m} label={m ? `${m} min before` : 'No reminder'} selected={remind === m} onPress={() => setRemind(m)} />
            ))}
          </View>
        ) : null}
        <Button
          label={edit ? 'Save' : 'Add'}
          disabled={!title.trim() || !okTime}
          onPress={() => {
            dispatch({ type: 'col/put', table: 'planner_items', row: { id: edit?.id ?? uid(), title: title.trim(), date: day, time: time ? norm(time) : undefined, remindMin: time ? remind : undefined, done: edit?.done ?? false } });
            onClose();
          }}
        />
        {edit ? <Button kind="firm" label="Delete" onPress={() => { dispatch({ type: 'col/del', table: 'planner_items', id: edit.id }); onClose(); }} /> : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space(2.5), paddingBottom: space(6), gap: space(1.5), maxWidth: 640, width: '100%', alignSelf: 'center' },
  strip: { flexDirection: 'row', alignItems: 'center' },
  sd: { width: 40, paddingVertical: 6, borderRadius: 14, alignItems: 'center', gap: 2 },
  sdw: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted },
  sdn: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  item: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), padding: space(2) },
  box: { width: 28, height: 28, borderRadius: 10, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  input: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.hairline, paddingHorizontal: space(2), fontFamily: fonts.body, fontSize: 16, color: colors.ink },
});
