import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Sheet } from '@/components/kit';
import { Button, Chip, T } from '@/components/ui';
import { DAY_LETTERS, HABIT_COLORS, type HabitMeta, habitsWithMeta } from '@/lib/habits';
import { uid, useStore } from '@/lib/store';
import { colors, fonts, radius, space } from '@/theme/tokens';

export const TEMPLATES = [
  { emoji: '😴', name: 'Sleep by 11 pm', min: 'Phone away by 11' },
  { emoji: '🌅', name: 'Wake by 6:30', min: 'Feet on the floor by 6:45' },
  { emoji: '💧', name: 'Water 8 glasses', min: '3 glasses' },
  { emoji: '🏃', name: 'Exercise 20 min', min: '5-minute walk' },
  { emoji: '📖', name: 'Read 10 pages', min: '1 page' },
  { emoji: '🎯', name: 'Deep work 90 min', min: '25 minutes' },
  { emoji: '🗣️', name: 'Speaking drill', min: 'One scenario' },
  { emoji: '📵', name: 'No phone first hour', min: '15 minutes' },
  { emoji: '👨‍👩‍👧', name: 'Family time', min: '10 focused minutes' },
  { emoji: '📝', name: 'Evening reflection', min: 'One sentence' },
  { emoji: '🧘', name: 'Meditate', min: '2 slow breaths x 5' },
  { emoji: '🥗', name: 'Healthy lunch', min: 'One healthy item' },
];
const EMOJIS = ['✨', '💪', '📚', '🧠', '💼', '🙏', '🚶', '🍎', '💤', '🎧', '🧹', '❤️'];

/** Create or edit a habit and its settings. `habitId` edits; omit to create. */
export function HabitForm({ visible, onClose, habitId, preset }: { visible: boolean; onClose: () => void; habitId?: string; preset?: { name: string; emoji: string; min?: string } }) {
  const { state, dispatch } = useStore();
  const existing = habitId ? habitsWithMeta(state).find((h) => h.id === habitId) : undefined;
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [color, setColor] = useState<string>(HABIT_COLORS[0]);
  const [days, setDays] = useState<number[]>([]);
  const [minVersion, setMin] = useState('');
  const [purpose, setPurpose] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [timer, setTimer] = useState('');
  const [reminder, setReminder] = useState('');

  useEffect(() => {
    if (!visible) return;
    setName(existing?.name ?? preset?.name ?? '');
    setEmoji(existing?.emoji ?? preset?.emoji ?? '✨');
    setColor(existing?.color ?? HABIT_COLORS[state.habits.length % HABIT_COLORS.length]);
    setDays(existing?.days ?? []);
    setMin(existing?.minVersion ?? preset?.min ?? '');
    setPurpose(existing?.purpose ?? '');
    setTarget(existing?.targetValue ? String(existing.targetValue) : '');
    setUnit(existing?.unit ?? '');
    setTimer(existing?.timerMin ? String(existing.timerMin) : '');
    setReminder(existing?.reminder ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, habitId, preset?.name]);

  const toggleDay = (d: number) => setDays((x) => (x.includes(d) ? x.filter((v) => v !== d) : [...x, d].sort()));
  const save = () => {
    const n = name.trim();
    if (!n) return;
    const id = existing?.id ?? uid();
    if (!existing) dispatch({ type: 'addHabit', habit: { id, name: n.slice(0, 60), emoji, createdAt: new Date().toISOString() } });
    const meta: HabitMeta & { id: string } = {
      id,
      color,
      days: days.length === 7 ? [] : days,
      minVersion: minVersion.trim().slice(0, 80) || undefined,
      purpose: purpose.trim().slice(0, 160) || undefined,
      targetValue: Number(target) > 0 ? Number(target) : undefined,
      unit: unit.trim().slice(0, 16) || undefined,
      timerMin: Number(timer) > 0 ? Math.min(240, Number(timer)) : undefined,
      reminder: /^\d{1,2}:\d{2}$/.test(reminder.trim()) ? reminder.trim() : undefined,
    };
    dispatch({ type: 'col/put', table: 'habit_meta', row: { ...meta, name: n.slice(0, 60), emoji } });
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={existing ? 'Edit habit' : 'New habit'}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: space(1.5), paddingBottom: space(2) }}>
        <TextInput value={name} onChangeText={setName} placeholder="Name the habit" placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel="Habit name" maxLength={60} />
        <View style={styles.wrap}>
          {EMOJIS.map((e) => (
            <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.em, emoji === e && { backgroundColor: colors.primarySoft, borderColor: colors.primary }]} accessibilityLabel={`Icon ${e}`}>
              <Text style={{ fontSize: 20 }}>{e}</Text>
            </Pressable>
          ))}
        </View>
        <T variant="label">Colour</T>
        <View style={styles.wrap}>
          {HABIT_COLORS.map((c) => (
            <Pressable key={c} onPress={() => setColor(c)} accessibilityLabel={`Colour ${c}`} style={[styles.dot, { backgroundColor: c }, color === c && { borderWidth: 3, borderColor: colors.ink }]} />
          ))}
        </View>
        <T variant="label">Days (none selected = every day)</T>
        <View style={styles.wrap}>
          {DAY_LETTERS.map((l, i) => (
            <Pressable key={i} onPress={() => toggleDay(i)} accessibilityRole="button" accessibilityState={{ selected: days.includes(i) }} accessibilityLabel={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]} style={[styles.day, days.includes(i) && { backgroundColor: color, borderColor: color }]}>
              <Text style={{ fontFamily: fonts.bodyBold, color: days.includes(i) ? '#fff' : colors.ink }}>{l}</Text>
            </Pressable>
          ))}
        </View>
        <T variant="label">Minimum version (for your worst day)</T>
        <TextInput value={minVersion} onChangeText={setMin} placeholder="e.g. 5-minute walk" placeholderTextColor={colors.muted} style={styles.input} maxLength={80} />
        <T variant="label">Why this matters to you</T>
        <TextInput value={purpose} onChangeText={setPurpose} placeholder="One line, in your own words" placeholderTextColor={colors.muted} style={styles.input} maxLength={160} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <T variant="label">Target</T>
            <TextInput value={target} onChangeText={setTarget} placeholder="8" keyboardType="numeric" placeholderTextColor={colors.muted} style={styles.input} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <T variant="label">Unit</T>
            <TextInput value={unit} onChangeText={setUnit} placeholder="glasses" placeholderTextColor={colors.muted} style={styles.input} maxLength={16} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <T variant="label">Timer (minutes)</T>
            <TextInput value={timer} onChangeText={setTimer} placeholder="25" keyboardType="numeric" placeholderTextColor={colors.muted} style={styles.input} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <T variant="label">Reminder (HH:MM)</T>
            <TextInput value={reminder} onChangeText={setReminder} placeholder="07:00" placeholderTextColor={colors.muted} style={styles.input} maxLength={5} />
          </View>
        </View>
        <Button label={existing ? 'Save changes' : 'Add habit'} disabled={!name.trim()} onPress={save} />
        {existing ? <Chip label="Archive this habit (keeps history)" onPress={() => { dispatch({ type: 'col/put', table: 'habit_meta', row: { id: existing.id, archived: true } }); onClose(); }} /> : null}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.hairline, paddingHorizontal: space(2), fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  em: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.hairline, backgroundColor: colors.surface },
  dot: { width: 36, height: 36, borderRadius: 18 },
  day: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.hairline, backgroundColor: colors.surface },
});
