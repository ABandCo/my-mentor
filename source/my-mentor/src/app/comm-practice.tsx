import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HBar } from '@/components/charts';
import { IconButton, Pill, ScreenHeader } from '@/components/kit';
import { MicButton } from '@/components/mic-button';
import { Button, Card, EmptyState, T } from '@/components/ui';
import { explain } from '@/lib/ai/explain';
import { aiScoreAnswer } from '@/lib/ai/tasks';
import { CRISIS_REPLY, detectCrisis } from '@/lib/ai/crisis';
import { attemptsOf, type Attempt, AREAS, CRITERIA, offlineScore, percentOf, scenarioById, type Scores } from '@/lib/comm-lab';
import { uid, useStore } from '@/lib/store';
import { speak, stopSpeaking } from '@/lib/voice';
import { colors, fonts, radius, space } from '@/theme/tokens';

type Result = { scores: Scores; percent: number; strengths: string[]; improve: string[]; rewrite: string; source: 'ai' | 'rules'; note?: string; prev?: number };

export default function CommPractice() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const sc = scenarioById(String(id));
  const [text, setText] = useState('');
  const [voice, setVoice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [crisis, setCrisis] = useState(false);
  const started = useRef<number>(Date.now());
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setSecs(Math.floor((Date.now() - started.current) / 1000)), 1000);
    return () => {
      clearInterval(iv);
      stopSpeaking();
    };
  }, []);

  if (!sc) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <EmptyState emoji="🔍" title="Scenario not found" body="Go back to the Communication Lab." action={<Button label="Back" onPress={() => router.back()} />} />
      </SafeAreaView>
    );
  }

  const prev = attemptsOf(state.collections).filter((a) => a.scenarioId === sc.id);
  const lastPrev = prev[0];
  const area = AREAS.find((a) => a.key === sc.area)!;

  const score = async () => {
    const answer = text.trim();
    if (answer.length < 5) return;
    if (detectCrisis(answer)) {
      setCrisis(true);
      return;
    }
    setBusy(true);
    let r: Result;
    const ai = state.profile.aiConsentGeneral ? await aiScoreAnswer(state, sc, answer) : null;
    if (ai && ai.ok) {
      r = { scores: ai.data.scores, percent: percentOf(ai.data.scores), strengths: ai.data.strengths, improve: ai.data.improve, rewrite: ai.data.rewrite, source: 'ai' };
    } else {
      const o = offlineScore(answer, sc);
      r = { scores: o.scores, percent: percentOf(o.scores), strengths: o.strengths, improve: o.improve, rewrite: '', source: 'rules', note: ai && !ai.ok ? explain(ai.code === 'crisis' ? 'ai_unavailable' : ai.code, state.profile.language) : 'AI is off, so this is a basic check of word counts, fillers and structure only. Turn on Krishna in Settings for a full review and a rewrite.' };
    }
    setBusy(false);
    r.prev = lastPrev?.percent; // the previous attempt, captured before this one is saved
    setRes(r);
    const attempt: Partial<Attempt> & { id: string } = { id: uid(), scenarioId: sc.id, area: sc.area, transcript: answer.slice(0, 2500), scores: r.scores, percent: r.percent, source: r.source, strengths: r.strengths, improve: r.improve, rewrite: r.rewrite, voice, seconds: secs };
    dispatch({ type: 'col/put', table: 'comm_attempts', row: attempt });
  };

  const again = () => {
    setRes(null);
    setText('');
    setVoice(false);
    started.current = Date.now();
    setSecs(0);
    stopSpeaking();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <ScreenHeader title={sc.title} left={<IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />} />
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Pill label={`${area.emoji} ${area.label}`} tone="sage" />
            <Pill label={`Aim: about ${sc.seconds} s`} tone="sand" icon="time-outline" />
            <Pill label={`Level ${sc.level}`} tone="sand" />
          </View>

          <Card tone="honey" style={{ gap: 6 }}>
            <T variant="label" style={{ color: colors.accentText }}>THE SITUATION</T>
            <T variant="body">{sc.setup}</T>
            <T variant="title">Your goal: {sc.goal}</T>
          </Card>

          {crisis ? (
            <Card tone="sand" style={{ gap: 8 }}>
              <T variant="body">{CRISIS_REPLY[state.profile.language]}</T>
              <Button kind="ghost" label="Back to practice" onPress={() => setCrisis(false)} />
            </Card>
          ) : !res ? (
            <>
              <T variant="label">Say it out loud (hold the mic), or type it. You can edit before scoring.</T>
              <TextInput
                value={text}
                onChangeText={(t) => setText(t)}
                placeholder="Your answer…"
                placeholderTextColor={colors.muted}
                multiline
                style={styles.input}
                accessibilityLabel="Your answer"
                maxLength={2500}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.timer}>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</Text>
                <MicButton size={64} onPartial={(t) => t && setText(t)} onText={(t) => { setText((cur) => (cur && cur !== t ? `${cur}`.trim() : t)); setVoice(true); }} />
                <Text style={styles.timer}>{text.trim() ? text.trim().split(/\s+/).length : 0} words</Text>
              </View>
              <Button label="Score my answer" loading={busy} disabled={text.trim().length < 5} onPress={score} />
              {lastPrev ? <T variant="caption">Last time on this scenario: {lastPrev.percent}% ({prev.length} attempt{prev.length > 1 ? 's' : ''}).</T> : null}
            </>
          ) : (
            <>
              <Card tone={res.percent >= 70 ? 'sage' : 'sand'} style={{ alignItems: 'center', gap: 4 }}>
                <Text style={styles.big}>{res.percent}%</Text>
                <T variant="body">
                  {res.source === 'ai' ? 'Krishna’s review' : 'Basic check'}
                  {res.prev !== undefined ? ` · ${res.percent - res.prev >= 0 ? '+' : ''}${res.percent - res.prev} vs last try` : ' · first try on this scenario'}
                </T>
              </Card>
              {res.note ? <T variant="caption">{res.note}</T> : null}
              <Card style={{ gap: space(1.25) }}>
                {CRITERIA.map((c) => (
                  <HBar key={c.key} label={c.label} value={res.scores[c.key]} max={5} color={colors.primary} right={`${res.scores[c.key]}/5`} />
                ))}
              </Card>
              {res.strengths.length ? (
                <Card tone="sage" style={{ gap: 6 }}>
                  <T variant="label">WHAT WORKED</T>
                  {res.strengths.map((s, i) => <T key={i} variant="body">• {s}</T>)}
                </Card>
              ) : null}
              {res.improve.length ? (
                <Card style={{ gap: 6 }}>
                  <T variant="label">TRY NEXT TIME</T>
                  {res.improve.map((s, i) => <T key={i} variant="body">• {s}</T>)}
                </Card>
              ) : null}
              {res.rewrite ? (
                <Card tone="honey" style={{ gap: 8 }}>
                  <T variant="label" style={{ color: colors.accentText }}>A TIGHTER VERSION</T>
                  <T variant="body">{res.rewrite}</T>
                  <Button compact kind="soft" label="🔊 Hear it" onPress={() => speak(res.rewrite, state.profile.language)} />
                </Card>
              ) : null}
              <Button label="Try again" onPress={again} />
              <Button kind="ghost" label="Done" onPress={() => router.back()} />
              <T variant="caption">Scores = five criteria, each 0 to 5, shown as a percentage. Saved on this device (and backed up if you are signed in) so you can see progress.</T>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space(2.5), paddingBottom: space(6), gap: space(2), maxWidth: 640, width: '100%', alignSelf: 'center' },
  input: { minHeight: 140, textAlignVertical: 'top', borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.hairline, padding: space(2), fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.ink },
  timer: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted, width: 80, textAlign: 'center' },
  big: { fontFamily: fonts.displayBold, fontSize: 54, color: colors.ink },
});
