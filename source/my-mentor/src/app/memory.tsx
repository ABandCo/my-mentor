import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, IconButton, Pill, ScreenHeader } from '@/components/kit';
import { Button, Card, Chip, EmptyState, T } from '@/components/ui';
import { liveRows, type Row } from '@/lib/collections';
import { uid, useStore } from '@/lib/store';
import { colors, fonts, radius, space } from '@/theme/tokens';

const KINDS = [
  { key: 'fact', label: 'Fact' },
  { key: 'preference', label: 'Preference' },
  { key: 'goal', label: 'Goal' },
  { key: 'priority', label: 'Priority' },
  { key: 'obstacle', label: 'Obstacle' },
  { key: 'lesson', label: 'Lesson' },
  { key: 'decision', label: 'Decision' },
] as const;

type Mem = Row & { kind: string; text: string; source: string; neverSendAi: boolean };

export default function Memory() {
  const { state, dispatch } = useStore();
  const rows = liveRows<Mem>(state.collections, 'mentor_memory', 'updatedAt');
  const [draft, setDraft] = useState('');
  const [kind, setKind] = useState<string>('fact');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    dispatch({ type: 'col/put', table: 'mentor_memory', row: { id: uid(), kind, text: t.slice(0, 400), source: 'user', confirmed: true, neverSendAi: false } });
    setDraft('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="What Krishna remembers" hi="याददाश्त" left={<IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />} />
        <T variant="body" style={{ color: colors.muted }}>
          Only things you told Krishna and approved. Edit or delete any of it at any time. Items marked private stay on your account and are never sent to AI.
        </T>

        <Card style={{ gap: space(1.5) }}>
          <T variant="title">Add something to remember</T>
          <View style={styles.wrap}>
            {KINDS.map((k) => (
              <Chip key={k.key} label={k.label} selected={kind === k.key} onPress={() => setKind(k.key)} />
            ))}
          </View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="e.g. I do my best deep work before 11 am"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
            maxLength={400}
            accessibilityLabel="Memory text"
          />
          <Button label="Remember this" disabled={!draft.trim()} onPress={add} />
        </Card>

        {rows.length === 0 ? (
          <EmptyState emoji="🧠" title="Nothing remembered yet" body="After a chat, tap “Wrap up and save”. Krishna will suggest things worth remembering, and you decide what to keep." />
        ) : (
          <View style={{ gap: space(1.25) }}>
            <T variant="label">{rows.length} REMEMBERED</T>
            {rows.map((r) => (
              <Card key={r.id} style={{ gap: space(1), padding: space(2) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Pill label={r.kind} tone="sage" />
                  {r.source !== 'user' ? <Pill label="from a chat" tone="sand" /> : null}
                  {r.neverSendAi ? <Pill label="private, never sent to AI" tone="gold" icon="lock-closed" /> : null}
                </View>
                {editing === r.id ? (
                  <>
                    <TextInput value={editText} onChangeText={setEditText} style={styles.input} multiline autoFocus accessibilityLabel="Edit memory" />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button
                        compact
                        label="Save"
                        style={{ flex: 1 }}
                        disabled={!editText.trim()}
                        onPress={() => {
                          dispatch({ type: 'col/put', table: 'mentor_memory', row: { id: r.id, text: editText.trim().slice(0, 400) } });
                          setEditing(null);
                        }}
                      />
                      <Button compact kind="ghost" label="Cancel" style={{ flex: 1 }} onPress={() => setEditing(null)} />
                    </View>
                  </>
                ) : (
                  <Text style={styles.text}>{r.text}</Text>
                )}
                {editing !== r.id ? (
                  <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={r.neverSendAi ? 'Allow sending to AI' : 'Keep private from AI'}
                      onPress={() => dispatch({ type: 'col/put', table: 'mentor_memory', row: { id: r.id, neverSendAi: !r.neverSendAi } })}
                      style={styles.act}>
                      <Icon name={r.neverSendAi ? 'lock-closed' : 'lock-open-outline'} size={18} color={colors.primaryText} />
                      <Text style={styles.actText}>{r.neverSendAi ? 'Private' : 'Keep private'}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Edit"
                      onPress={() => {
                        setEditing(r.id);
                        setEditText(r.text);
                      }}
                      style={styles.act}>
                      <Icon name="create-outline" size={18} color={colors.primaryText} />
                      <Text style={styles.actText}>Edit</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel="Delete" onPress={() => dispatch({ type: 'col/del', table: 'mentor_memory', id: r.id })} style={styles.act}>
                      <Icon name="trash-outline" size={18} color={colors.firmText} />
                      <Text style={[styles.actText, { color: colors.firmText }]}>Delete</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space(2.5), gap: space(2), paddingBottom: space(6), maxWidth: 640, width: '100%', alignSelf: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
  input: { minHeight: 52, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.hairline, paddingHorizontal: space(2), paddingVertical: 10, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  text: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.ink },
  act: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  actText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.primaryText },
});
