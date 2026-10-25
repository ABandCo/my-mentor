// Weekly content / Comerze / product pipeline with today's one small deliverable.
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Chip, T, tap } from '@/components/ui';
import { configOf } from '@/lib/discipline';
import { dateKey } from '@/lib/metrics';
import { say } from '@/lib/nudges';
import { nextDeliverable, nextStatus, pipeRow, pipelineOf, type PipeType, TYPES } from '@/lib/pipeline';
import { useStore } from '@/lib/store';
import { weekKey } from '@/lib/pipeline';
import { colors, radius, space } from '@/theme/tokens';

export function PipelineCard() {
  const { state, dispatch } = useStore();
  const week = weekKey(dateKey());
  const cfg = configOf(state.collections);
  const items = pipelineOf(state.collections, week);
  const [type, setType] = useState<PipeType>('content');
  const [text, setText] = useState('');
  return (
    <Card style={{ gap: space(1.5) }}>
      <T variant="label">IS HAFTE KI PIPELINE · CONTENT, COMERZE, PRODUCT</T>
      <T variant="body">🎯 {say(nextDeliverable(items), cfg.nudgeLang)}</T>
      {items.map((i) => {
        const t = TYPES.find((x) => x.key === i.type)!;
        return (
          <Pressable key={i.id} onPress={() => { tap(); dispatch({ type: 'col/put', table: 'journal_entries', row: { id: i.id, status: nextStatus(i.status) } }); }} style={s.item} accessibilityRole="button" accessibilityLabel={`${i.text}, ${i.status}. Tap to advance`}>
            <T variant="body" style={{ flex: 1 }}>{t.emoji} {i.text}</T>
            <T variant="caption" style={{ color: i.status === 'posted' ? colors.success : colors.muted }}>{i.status}</T>
          </Pressable>
        );
      })}
      <View style={s.chips}>
        {TYPES.map((t) => <Chip key={t.key} label={t.label} selected={type === t.key} onPress={() => setType(t.key)} />)}
      </View>
      <TextInput value={text} onChangeText={setText} placeholder="Naya idea (ek line)" placeholderTextColor={colors.muted} style={s.input} maxLength={120} />
      <Button compact kind="soft" label="Add to this week" disabled={!text.trim()} onPress={() => {
        const n = Object.keys(state.collections.journal_entries ?? {}).filter((k) => k.startsWith(`pipe:${week}:`)).length + 1;
        dispatch({ type: 'col/put', table: 'journal_entries', row: pipeRow(week, n, type, text.trim()) });
        setText('');
      }} />
    </Card>
  );
}

const s = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: space(1), paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.sm, padding: space(1.5), color: colors.ink, backgroundColor: colors.surface },
});
