import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton, Pill, ScreenHeader, Segmented } from '@/components/kit';
import { Button, Card, Chip, EmptyState, SectionTitle, T, tap } from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { type CoupleItem, agreements, theirs, useCouple } from '@/lib/couple';
import { GUIDES, LOVE_LANGUAGES, LOVE_QUIZ, type LoveKey, loveResult, noteFor, pick, quoteFor, REPAIR, RITUALS } from '@/lib/couple-content';
import { dateKey } from '@/lib/metrics';
import { useStore } from '@/lib/store';
import { colors, fonts, radius, space } from '@/theme/tokens';

type Tab = 'today' | 'together' | 'talk' | 'rituals' | 'repair';
const THEMES = ['love', 'respect', 'appreciation', 'repair'] as const;
const weekKey = (d: string) => {
  const t = new Date(`${d}T12:00:00+05:30`);
  const y = t.getUTCFullYear();
  const wk = Math.floor((t.getTime() - Date.UTC(y, 0, 1)) / (7 * 86400000));
  return `${y}-W${String(wk).padStart(2, '0')}`;
};

export default function Couple() {
  const [tab, setTab] = useState<Tab>('today');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Couple Space" hi="साथ में" left={<IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />} />
        <Segmented<Tab> value={tab} onChange={setTab} options={[{ key: 'today', label: 'Today' }, { key: 'together', label: 'Together' }, { key: 'talk', label: 'Talk' }, { key: 'rituals', label: 'Rituals' }, { key: 'repair', label: 'Repair' }]} />
        {tab === 'today' && <TodayTab />}
        {tab === 'together' && <TogetherTab />}
        {tab === 'talk' && <TalkTab />}
        {tab === 'rituals' && <RitualsTab />}
        {tab === 'repair' && <RepairTab />}
        <T variant="caption">No scores, no rankings, no comparisons between the two of you. Only what you each choose to share is ever visible to the other.</T>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------------- Today ---------------- */
function TodayTab() {
  const { state } = useStore();
  const lang = state.profile.language;
  const today = dateKey();
  const note = noteFor(today);
  const [theme, setTheme] = useState<(typeof THEMES)[number]>('love');
  const q = quoteFor(today, theme);
  const [copied, setCopied] = useState(false);
  const [answers, setAnswers] = useState<LoveKey[]>([]);
  const result = answers.length === LOVE_QUIZ.length ? loveResult(answers) : null;
  return (
    <View style={{ gap: space(1.5) }}>
      <Card tone="honey" style={{ gap: 8 }}>
        <T variant="label" style={{ color: colors.accentText }}>TODAY'S SMALL ACT · {note.theme.toUpperCase()}</T>
        <T variant="h2">{pick(note.note, lang)}</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button compact kind="soft" label="Share with partner" onPress={() => Share.share({ message: pick(note.note, lang) })} />
        </View>
      </Card>
      <Card style={{ gap: 10 }}>
        <View style={styles.wrap}>
          {THEMES.map((t) => (
            <Chip key={t} label={t[0].toUpperCase() + t.slice(1)} selected={theme === t} onPress={() => setTheme(t)} />
          ))}
        </View>
        <Text style={styles.quote}>“{pick(q.q, lang)}”</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button compact kind="ghost" label={copied ? 'Copied ✓' : 'Copy'} onPress={async () => { await Clipboard.setStringAsync(pick(q.q, lang)); setCopied(true); setTimeout(() => setCopied(false), 1500); }} />
          <Button compact kind="ghost" label="Send to partner" onPress={() => Share.share({ message: pick(q.q, lang) })} />
        </View>
      </Card>
      <Card style={{ gap: 10 }}>
        <SectionTitle title="Love languages (a conversation starter)" />
        {result ? (
          <>
            {result.map((r) => (
              <View key={r.key} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={styles.ll}>{r.label}</Text>
                <Text style={styles.small}>{r.score}/{LOVE_QUIZ.length}</Text>
              </View>
            ))}
            <T variant="body">Your strongest: {result[0].label}. {result[0].tip} Share this with your partner and ask for theirs. It is a starting point, not a diagnosis.</T>
            <Button compact kind="ghost" label="Retake" onPress={() => setAnswers([])} />
          </>
        ) : (
          <>
            <T variant="label">Question {answers.length + 1} of {LOVE_QUIZ.length}</T>
            <T variant="title">{LOVE_QUIZ[answers.length].q}</T>
            {LOVE_QUIZ[answers.length].options.map((o) => (
              <Button key={o.text} kind="soft" label={o.text} onPress={() => setAnswers([...answers, o.key])} />
            ))}
          </>
        )}
        <Text style={styles.small}>{LOVE_LANGUAGES.length} styles: words, time, acts, touch, gifts.</Text>
      </Card>
    </View>
  );
}

/* ---------------- Together ---------------- */
function TogetherTab() {
  const { session } = useStore();
  const c = useCouple();
  const [code, setCode] = useState('');
  if (!session) {
    return (
      <EmptyState emoji="🔐" title="Sign in to share" body="Sharing needs an account for each of you, so only the two of you can see what you share. Everything else in Couple Space works without one." action={<Button label="Sign in" onPress={() => router.push('/sign-in')} />} />
    );
  }
  if (c.loading) return <T variant="body">Loading…</T>;
  if (!c.couple || c.couple.status === 'ended') {
    return (
      <View style={{ gap: space(1.5) }}>
        <Card style={{ gap: 10 }}>
          <T variant="h2">Link with your partner</T>
          <T variant="body" style={{ color: colors.muted }}>Both of you must agree. One creates a code, the other enters it. You can end the link at any time and everything shared disappears for both of you.</T>
          <Button label="Create an invite code" onPress={c.createInvite} />
        </Card>
        <Card style={{ gap: 10 }}>
          <T variant="title">Have a code?</T>
          <TextInput value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" placeholder="8-character code" placeholderTextColor={colors.muted} style={styles.input} maxLength={8} accessibilityLabel="Invite code" />
          <Button kind="soft" label="Join" disabled={code.trim().length < 8} onPress={() => c.accept(code)} />
        </Card>
        {c.error ? <T variant="body" style={{ color: colors.firmText }}>{c.error}</T> : null}
      </View>
    );
  }
  if (c.couple.status === 'pending') {
    return (
      <Card style={{ gap: 10, alignItems: 'center' }}>
        <T variant="label">YOUR INVITE CODE</T>
        <Text style={styles.code} selectable accessibilityLabel={`Invite code ${c.couple.inviteCode.split('').join(' ')}`}>{c.couple.inviteCode}</Text>
        <T variant="body" style={{ textAlign: 'center', color: colors.muted }}>Give this to your partner in person or by message. They enter it under Together. It works once.</T>
        <Button compact kind="soft" label="Share code" onPress={() => Share.share({ message: `My Mentor Couple Space code: ${c.couple!.inviteCode}` })} />
        <Button compact kind="ghost" label="Refresh" onPress={c.refresh} />
        <Button compact kind="firm" label="Cancel invite" onPress={c.end} />
        {c.error ? <T variant="body" style={{ color: colors.firmText }}>{c.error}</T> : null}
      </Card>
    );
  }
  return <Linked c={c} />;
}

function Linked({ c }: { c: ReturnType<typeof useCouple> }) {
  const me = c.me;
  const today = dateKey();
  const [text, setText] = useState('');
  const [goal, setGoal] = useState('');
  const [mile, setMile] = useState('');
  const [chk, setChk] = useState({ high: '', hard: '', need: '' });
  const [refl, setRefl] = useState({ good: '', grow: '', next: '' });
  const wk = weekKey(today);
  const month = today.slice(0, 7);
  const byKind = (k: CoupleItem['kind']) => c.items.filter((i) => i.kind === k);
  const myChk = byKind('checkin').find((i) => i.author === me && i.data.week === wk);
  const partnerChk = theirs(byKind('checkin'), me).find((i) => i.data.week === wk);
  const myRefl = byKind('reflection').find((i) => i.author === me && i.data.month === month);
  const partnerRefl = theirs(byKind('reflection'), me).find((i) => i.data.month === month);
  const goals = agreements(c.items, 'goal');
  const mineAll = c.items.filter((i) => i.author === me);
  return (
    <View style={{ gap: space(1.5) }}>
      <Card tone="sage" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 28 }}>💞</Text>
        <View style={{ flex: 1 }}>
          <T variant="title">Linked with {c.partner}</T>
          <T variant="caption">Only what you each post is visible to the other.</T>
        </View>
        <IconButton icon="refresh" label="Refresh" onPress={c.refresh} />
      </Card>
      {c.error ? <T variant="body" style={{ color: colors.firmText }}>{c.error}</T> : null}

      <Card style={{ gap: 10 }}>
        <SectionTitle title="Gratitude notes" />
        <TextInput value={text} onChangeText={setText} placeholder={`One thing you appreciate about ${c.partner}…`} placeholderTextColor={colors.muted} style={styles.input} multiline maxLength={400} />
        <Button label="Send gratitude" disabled={!text.trim()} onPress={async () => { tap('success'); if (await c.post('gratitude', { text: text.trim() })) setText(''); }} />
        {byKind('gratitude').slice(0, 6).map((g) => (
          <View key={g.id} style={[styles.bubble, g.author === me ? { backgroundColor: colors.primarySoft } : { backgroundColor: colors.accentSoft }]}>
            <Text style={styles.small}>{g.author === me ? 'You' : c.partner} · {g.createdAt.slice(0, 10)}</Text>
            <T variant="body">{String(g.data.text ?? '')}</T>
          </View>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <SectionTitle title="Weekly check-in" action={<Pill label={wk} tone="sand" />} />
        {myChk ? (
          <Pill label="You've done this week's check-in ✓" tone="sage" />
        ) : (
          <>
            <TextInput value={chk.high} onChangeText={(v) => setChk({ ...chk, high: v })} placeholder="Best moment of our week" placeholderTextColor={colors.muted} style={styles.input} maxLength={300} />
            <TextInput value={chk.hard} onChangeText={(v) => setChk({ ...chk, hard: v })} placeholder="Something that was hard" placeholderTextColor={colors.muted} style={styles.input} maxLength={300} />
            <TextInput value={chk.need} onChangeText={(v) => setChk({ ...chk, need: v })} placeholder="What I need from you next week" placeholderTextColor={colors.muted} style={styles.input} maxLength={300} />
            <Button label="Share my check-in" disabled={!chk.high.trim() && !chk.hard.trim() && !chk.need.trim()} onPress={() => c.post('checkin', { week: wk, ...chk })} />
          </>
        )}
        {partnerChk ? (
          <View style={[styles.bubble, { backgroundColor: colors.accentSoft }]}>
            <Text style={styles.small}>{c.partner}'s check-in</Text>
            <T variant="body">Best: {String(partnerChk.data.high ?? '—')}{'\n'}Hard: {String(partnerChk.data.hard ?? '—')}{'\n'}Needs: {String(partnerChk.data.need ?? '—')}</T>
          </View>
        ) : (
          <T variant="caption">{c.partner} hasn't shared this week yet.</T>
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <SectionTitle title="Shared goals" />
        <T variant="caption">A goal becomes shared only when the other person agrees.</T>
        <TextInput value={goal} onChangeText={setGoal} placeholder="e.g. A weekend away before March" placeholderTextColor={colors.muted} style={styles.input} maxLength={140} />
        <Button kind="soft" label="Propose goal" disabled={!goal.trim()} onPress={async () => { if (await c.post('goal', { title: goal.trim() })) setGoal(''); }} />
        {goals.map(({ item, active, agreeId }) => {
          const mineG = item.author === me;
          const done = !!item.data.done;
          return (
            <View key={item.id} style={styles.gRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ll, done && { textDecorationLine: 'line-through', color: colors.muted }]}>{String(item.data.title)}</Text>
                <Text style={styles.small}>{mineG ? 'You proposed' : `${c.partner} proposed`} · {active ? 'shared' : 'waiting for agreement'}</Text>
              </View>
              {!active && !mineG ? <Button compact label="Agree" onPress={() => c.post('goal_agree', { ref: item.id })} /> : null}
              {active ? <Button compact kind="soft" label={done ? 'Reopen' : 'Done'} onPress={() => c.post('goal', { ...item.data, done: !done }, item.id)} disabled={!mineG} /> : null}
              {active && !mineG && agreeId ? <Button compact kind="ghost" label="Withdraw" onPress={() => c.remove(agreeId)} /> : null}
              {mineG ? <Button compact kind="ghost" label="Remove" onPress={() => c.remove(item.id)} /> : null}
            </View>
          );
        })}
      </Card>

      <Card style={{ gap: 10 }}>
        <SectionTitle title="Milestones" />
        <TextInput value={mile} onChangeText={setMile} placeholder="A moment worth marking together" placeholderTextColor={colors.muted} style={styles.input} maxLength={140} />
        <Button kind="soft" label="Add milestone" disabled={!mile.trim()} onPress={async () => { if (await c.post('milestone', { title: mile.trim(), date: today })) setMile(''); }} />
        {byKind('milestone').slice(0, 8).map((m) => (
          <View key={m.id} style={styles.gRow}>
            <Text style={{ fontSize: 20 }}>⭐</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.ll}>{String(m.data.title)}</Text>
              <Text style={styles.small}>{String(m.data.date ?? m.createdAt.slice(0, 10))} · {m.author === me ? 'you' : c.partner}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <SectionTitle title="Monthly reflection" action={<Pill label={month} tone="sand" />} />
        {myRefl ? (
          <Pill label="Your reflection is shared ✓" tone="sage" />
        ) : (
          <>
            <TextInput value={refl.good} onChangeText={(v) => setRefl({ ...refl, good: v })} placeholder="What went well between us this month" placeholderTextColor={colors.muted} style={styles.input} maxLength={300} />
            <TextInput value={refl.grow} onChangeText={(v) => setRefl({ ...refl, grow: v })} placeholder="Where I'd like us to grow" placeholderTextColor={colors.muted} style={styles.input} maxLength={300} />
            <TextInput value={refl.next} onChangeText={(v) => setRefl({ ...refl, next: v })} placeholder="One thing I'll do next month" placeholderTextColor={colors.muted} style={styles.input} maxLength={300} />
            <Button label="Share reflection" disabled={!refl.good.trim() && !refl.grow.trim() && !refl.next.trim()} onPress={() => c.post('reflection', { month, ...refl })} />
          </>
        )}
        {partnerRefl ? (
          <View style={[styles.bubble, { backgroundColor: colors.accentSoft }]}>
            <Text style={styles.small}>{c.partner}'s reflection</Text>
            <T variant="body">Went well: {String(partnerRefl.data.good ?? '—')}{'\n'}Grow: {String(partnerRefl.data.grow ?? '—')}{'\n'}Next: {String(partnerRefl.data.next ?? '—')}</T>
          </View>
        ) : null}
      </Card>

      <Card tone="sand" style={{ gap: 10 }}>
        <SectionTitle title="Sharing controls" />
        <T variant="body">You have shared {mineAll.length} item{mineAll.length === 1 ? '' : 's'}. You can remove any of them, and {c.partner} can no longer see it.</T>
        {mineAll.slice(0, 10).map((i) => (
          <View key={i.id} style={styles.gRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ll} numberOfLines={1}>{i.kind}: {String(i.data.text ?? i.data.title ?? i.data.high ?? i.data.good ?? '')}</Text>
              <Text style={styles.small}>{i.createdAt.slice(0, 10)}</Text>
            </View>
            <Button compact kind="ghost" label="Unshare" onPress={() => c.remove(i.id)} />
          </View>
        ))}
        <Button
          kind="firm"
          label="End the link"
          onPress={async () => {
            if (await confirmAction('End the link?', `Everything shared will disappear for both of you. You can link again later with a new code.`, 'End link')) c.end();
          }}
        />
      </Card>
    </View>
  );
}

/* ---------------- Talk ---------------- */
function TalkTab() {
  const { state } = useStore();
  const [open, setOpen] = useState<string | null>('weekly');
  return (
    <View style={{ gap: space(1.25) }}>
      <T variant="body" style={{ color: colors.muted }}>Short guides for conversations that matter. Use them as prompts, not a script. Sit side by side, phones away.</T>
      {GUIDES.map((g) => (
        <Pressable key={g.id} onPress={() => setOpen(open === g.id ? null : g.id)} accessibilityRole="button" accessibilityState={{ expanded: open === g.id }}>
          <Card style={{ gap: 8 }}>
            <Text style={styles.gTitle}>{pick(g.title, state.profile.language)}</Text>
            {open === g.id ? (
              <>
                <T variant="body" style={{ color: colors.muted }}>{g.purpose}</T>
                {g.questions.map((q, i) => (
                  <T key={i} variant="body">{i + 1}. {q}</T>
                ))}
                <Card tone="honey" style={{ padding: space(1.5) }}>
                  <T variant="caption" style={{ color: colors.accentText }}>Tip: {g.tip}</T>
                </Card>
              </>
            ) : null}
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

/* ---------------- Rituals ---------------- */
function RitualsTab() {
  const { state, dispatch } = useStore();
  const adopted = new Set(Object.values(state.collections.journal_entries ?? {}).filter((r) => !r.deletedAt && String(r.id).startsWith('ritual:')).map((r) => String(r.id).slice(7)));
  return (
    <View style={{ gap: space(1.25) }}>
      <T variant="body" style={{ color: colors.muted }}>Small repeated moments build closeness. Choose two or three you can actually keep.</T>
      {RITUALS.map((r) => {
        const on = adopted.has(r.id);
        return (
          <Card key={r.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.gTitle, { flex: 1 }]}>{pick(r.title, state.profile.language)}</Text>
              {on ? <Pill label="Our ritual" tone="sage" /> : null}
            </View>
            <Text style={styles.small}>{r.when}</Text>
            <T variant="body">{r.how}</T>
            <Button compact kind={on ? 'ghost' : 'soft'} label={on ? 'Remove from our rituals' : 'Make this ours'} onPress={() => (on ? dispatch({ type: 'col/del', table: 'journal_entries', id: `ritual:${r.id}` }) : dispatch({ type: 'col/put', table: 'journal_entries', row: { id: `ritual:${r.id}`, kind: 'ritual', adopted: true } }))} />
          </Card>
        );
      })}
    </View>
  );
}

/* ---------------- Repair ---------------- */
function RepairTab() {
  const { state } = useStore();
  const lang = state.profile.language;
  return (
    <View style={{ gap: space(1.25) }}>
      <Card tone="sand" style={{ gap: 6 }}>
        <T variant="label">BEFORE YOU SPEAK</T>
        <T variant="body">Breathe out slowly for six counts. Ask yourself: do I want to be right, or do I want to be close? Speak to the person, not the problem.</T>
      </Card>
      {REPAIR.map((s) => (
        <Card key={s.id} style={{ gap: 8 }}>
          <T variant="label">{pick(s.when, lang).toUpperCase()}</T>
          <T variant="h2">{pick(s.say, lang)}</T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button compact kind="ghost" label="Copy" onPress={() => Clipboard.setStringAsync(pick(s.say, lang))} />
            <Button compact kind="ghost" label="Share" onPress={() => Share.share({ message: pick(s.say, lang) })} />
          </View>
        </Card>
      ))}
      <Card tone="honey" style={{ gap: 6 }}>
        <T variant="label" style={{ color: colors.accentText }}>IF THINGS FEEL UNSAFE</T>
        <T variant="body">If you or your partner feel unsafe or hopeless, please contact someone you trust or a professional. India: 112 for emergencies, Tele-MANAS 14416 for mental health support.</T>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space(2.5), paddingBottom: space(6), gap: space(1.75), maxWidth: 640, width: '100%', alignSelf: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quote: { fontFamily: fonts.display, fontSize: 20, lineHeight: 28, color: colors.ink },
  small: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  ll: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  gTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  code: { fontFamily: fonts.displayBold, fontSize: 40, letterSpacing: 6, color: colors.primaryText },
  input: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.hairline, paddingHorizontal: space(2), paddingVertical: 10, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  bubble: { borderRadius: 16, padding: space(1.5), gap: 2 },
  gRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', minHeight: 48 },
});
