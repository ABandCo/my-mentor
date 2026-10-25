import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon, Pill, type IconName } from '@/components/kit';
import { Button } from '@/components/ui';
import type { ExtractData, PlanData, ReviewData } from '@/lib/ai/use-mentor';
import { istHour } from '@/lib/metrics';
import { type ChatMsg, uid, useStore } from '@/lib/store';
import { useMentorActions } from '@/lib/ai/mentor-actions';
import { colors, fonts, radius, space } from '@/theme/tokens';

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

export function PlanCard({ chatId, msg }: { chatId: string; msg: ChatMsg }) {
  const { applyPlan } = useMentorActions();
  const plan = msg.card?.data as PlanData | undefined;
  if (!plan) return null;
  const applied = !!msg.card?.applied;
  const future = plan.hourly.filter((h) => h.hour > istHour());
  return (
    <View style={styles.card}>
      <Text style={styles.label}>TODAY'S ONE THING</Text>
      <Text style={styles.big}>{plan.oneThing}</Text>
      {future.length ? (
        <View style={{ gap: 6, marginTop: space(1) }}>
          {future.map((h, i) => (
            <View key={i} style={styles.planRow}>
              <Text style={styles.hour}>{hh(h.hour)}</Text>
              <Text style={styles.planText}>{h.plan}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {plan.notes ? <Text style={styles.note}>{plan.notes}</Text> : null}
      <Button style={{ marginTop: space(1.5) }} compact kind={applied ? 'soft' : 'primary'} disabled={applied} label={applied ? '✓ Added to Today' : 'Use this plan'} onPress={() => applyPlan(chatId, msg.id, plan)} />
    </View>
  );
}

export function ReviewCard({ chatId, msg }: { chatId: string; msg: ChatMsg }) {
  const { dispatch } = useStore();
  const r = msg.card?.data as ReviewData | undefined;
  if (!r) return null;
  const applied = !!msg.card?.applied;
  const section = (title: string, icon: IconName, tone: string, items: string[]) =>
    items.length ? (
      <View style={{ gap: 4, marginTop: space(1.5) }}>
        <Text style={styles.label}>{title}</Text>
        {items.map((t, i) => (
          <View key={i} style={styles.bullet}>
            <Icon name={icon} size={16} color={tone} style={{ marginTop: 3 }} />
            <Text style={styles.planText}>{t}</Text>
          </View>
        ))}
      </View>
    ) : null;
  return (
    <View style={styles.card}>
      {section('WINS (RECORDED)', 'checkmark-circle', colors.success, r.wins)}
      {section('WHAT GOT IN THE WAY', 'alert-circle', colors.attention, r.obstacles)}
      {section('PATTERNS (HYPOTHESES)', 'search', colors.muted, r.patterns)}
      {section('CHANGES TO TRY', 'swap-horizontal', colors.primary, r.changes)}
      {r.priorities.length ? (
        <View style={{ gap: 4, marginTop: space(1.5) }}>
          <Text style={styles.label}>NEXT WEEK'S 3 PRIORITIES</Text>
          {r.priorities.map((t, i) => (
            <View key={i} style={styles.bullet}>
              <Text style={styles.num}>{i + 1}</Text>
              <Text style={[styles.planText, { fontFamily: fonts.bodySemi }]}>{t}</Text>
            </View>
          ))}
          <Button
            style={{ marginTop: space(1) }}
            compact
            kind={applied ? 'soft' : 'primary'}
            disabled={applied}
            label={applied ? '✓ Added as commitments' : 'Make these my commitments'}
            onPress={() => {
              const t = new Date().toISOString();
              for (const p of r.priorities) dispatch({ type: 'addCommitment', c: { id: uid(), text: p, done: false, createdAt: t } });
              dispatch({ type: 'chat/patch', chatId, msgId: msg.id, patch: { card: { applied: true } } });
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

type Item = { key: string; kind: 'commitment' | 'habit' | 'goal' | 'memory'; text: string; due?: string; memKind?: string };

export function ExtractCard({ chatId, msg }: { chatId: string; msg: ChatMsg }) {
  const { decide } = useMentorActions();
  const d = msg.card?.data as ExtractData | undefined;
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  if (!d) return null;
  const items: Item[] = [
    ...d.actions.map((a, i) => ({ key: `a${i}`, kind: a.type, text: a.text, due: a.due }) as Item),
    ...d.memories.map((m, i) => ({ key: `m${i}`, kind: 'memory', text: m.text, memKind: m.kind }) as Item),
  ];
  if (!items.length) return null;
  const decided = msg.card?.decided ?? {};
  const meta: Record<Item['kind'], { icon: IconName; label: string }> = {
    commitment: { icon: 'checkbox-outline', label: 'Commitment' },
    habit: { icon: 'leaf-outline', label: 'Habit' },
    goal: { icon: 'flag-outline', label: 'Goal' },
    memory: { icon: 'bulb-outline', label: 'Remember' },
  };
  return (
    <View style={{ gap: space(1), marginTop: space(1) }}>
      <Text style={styles.label}>SAVE FROM THIS CHAT</Text>
      {items.map((it) => {
        const state = decided[it.key];
        const text = edits[it.key] ?? it.text;
        return (
          <View key={it.key} style={[styles.item, state && { opacity: 0.55 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name={meta[it.kind].icon} size={16} color={colors.primaryText} />
              <Pill label={meta[it.kind].label} tone={it.kind === 'memory' ? 'gold' : 'sage'} />
              {it.due ? <Pill label={`by ${it.due}`} tone="sand" /> : null}
            </View>
            {editing === it.key ? (
              <TextInput value={text} onChangeText={(v) => setEdits((e) => ({ ...e, [it.key]: v }))} style={styles.input} multiline autoFocus accessibilityLabel="Edit text" />
            ) : (
              <Text style={styles.planText}>{text}</Text>
            )}
            {state ? (
              <Text style={styles.decided}>{state === 'accepted' ? '✓ Saved' : 'Dismissed'}</Text>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Button
                  compact
                  label="Accept"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setEditing(null);
                    decide(chatId, msg.id, it.key, true, { kind: it.kind, text: text.trim() || it.text, due: it.due, memKind: it.memKind });
                  }}
                />
                <Button compact kind="soft" label={editing === it.key ? 'Done' : 'Edit'} style={{ flex: 1 }} onPress={() => setEditing(editing === it.key ? null : it.key)} />
                <Button compact kind="ghost" label="Dismiss" style={{ flex: 1 }} onPress={() => decide(chatId, msg.id, it.key, false, { kind: it.kind, text: it.text })} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bg, borderRadius: radius.md, padding: space(1.75), marginTop: space(1), gap: 2, borderWidth: 1, borderColor: colors.hairline },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, color: colors.primaryText },
  big: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, color: colors.ink, marginTop: 2 },
  planRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  hour: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.primaryText, width: 48, marginTop: 2 },
  planText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink, flex: 1 },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: space(1) },
  bullet: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  num: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, color: '#fff', textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 22, overflow: 'hidden' },
  item: { backgroundColor: colors.bg, borderRadius: radius.md, padding: space(1.5), gap: 6, borderWidth: 1, borderColor: colors.hairline },
  decided: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.primaryText },
  input: { minHeight: 48, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.hairline, paddingHorizontal: space(1.5), paddingVertical: 8, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
});
