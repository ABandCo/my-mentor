import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, IconButton, type IconName } from '@/components/kit';
import { Bubble, TypingDots } from '@/components/mentor/bubble';
import { MentorOrb } from '@/components/mentor-orb';
import { MicButton } from '@/components/mic-button';
import { speak, stopSpeaking } from '@/lib/voice';
import { Button, T, tap } from '@/components/ui';
import { contextCategories } from '@/lib/ai/context';
import { offlineCoach } from '@/lib/ai/offline-coach';
import { QUICK_PROMPTS, useMentor } from '@/lib/ai/use-mentor';
import { liveRows } from '@/lib/collections';
import { useStore } from '@/lib/store';
import { useKeyboardVisible } from '@/lib/use-keyboard';
import { colors, fonts, radius, shadow, space } from '@/theme/tokens';

type Tile = { icon: IconName; title: string; sub: string; run: () => void };

function greeting(h: number) {
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function MentorScreen() {
  const m = useMentor();
  const { state } = useStore();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);
  const kb = useKeyboardVisible();
  const cats = contextCategories(state.profile);
  const memCount = liveRows(state.collections, 'mentor_memory').length;
  const nudge = offlineCoach(state);
  const hourIST = new Date(Date.now() + 330 * 60000).getUTCHours();

  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(t);
  }, [m.messages.length, m.busy]);

  // Speak new replies aloud when the user turned that on (never the crisis message: that one is read, not performed).
  const lastId = useRef<string | null>(null);
  useEffect(() => {
    const last = m.messages[m.messages.length - 1];
    if (!last || last.id === lastId.current) return;
    lastId.current = last.id;
    if (state.prefs.speakReplies && last.role === 'model' && !last.crisis && !last.card) speak(last.text, state.profile.language);
  }, [m.messages, state.prefs.speakReplies, state.profile.language]);
  useEffect(() => () => stopSpeaking(), []);

  const submit = () => {
    const v = text.trim();
    if (!v) return;
    setText('');
    m.send(v);
  };

  const tiles: Tile[] = [
    { icon: 'sunny-outline', title: 'Plan my day', sub: 'One Thing + the hours left', run: () => m.planDay() },
    { icon: 'flame-outline', title: 'Push me on habits', sub: 'Uses your real numbers', run: () => m.send(QUICK_PROMPTS.habits) },
    { icon: 'calendar-outline', title: 'Review my week', sub: 'Honest, from records', run: () => m.review() },
    { icon: 'hourglass-outline', title: "I'm procrastinating", sub: 'Start the hard thing', run: () => m.send(QUICK_PROMPTS.procrastinating) },
    { icon: 'refresh-outline', title: 'I need a reset', sub: 'Bad day? Restart gently', run: () => m.send(QUICK_PROMPTS.reset) },
    { icon: 'mic-outline', title: 'Practice a client call', sub: 'Communication Lab', run: () => router.push('/comm-lab') },
  ];

  const empty = m.messages.length === 0;
  const toneBg = nudge.tone === 'firm' ? '#F6E1DA' : nudge.tone === 'celebrate' ? colors.accentSoft : colors.primarySoft;
  const toneFg = nudge.tone === 'firm' ? colors.firmText : nudge.tone === 'celebrate' ? colors.accentText : colors.primaryText;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 70, height: 70, alignItems: 'center', justifyContent: 'center', marginLeft: -12 }}>
            <MentorOrb size={50} state={m.orb} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Krishna</Text>
            <Text style={styles.sub}>
              your Saarthi <Text style={{ fontFamily: fonts.hindi }}>· सारथी</Text>
            </Text>
          </View>
          <IconButton icon="bulb-outline" label={`Memory, ${memCount} items`} tone="soft" onPress={() => router.push('/memory')} badge={memCount > 0} />
          <IconButton icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
          {m.chat && !empty ? <IconButton icon="add-circle-outline" label="New chat" onPress={m.newChat} /> : null}
        </View>

        {/* Privacy strip */}
        <Pressable onPress={() => router.push('/settings')} style={styles.strip} accessibilityRole="button" accessibilityLabel="AI privacy settings">
          {cats.length ? (
            <>
              <Icon name="shield-checkmark-outline" size={16} color={colors.primaryText} />
              <Text style={styles.stripText} numberOfLines={1}>
                Private. Names masked. AI sees: {['plans & habits', ...(cats.includes('work') ? ['work'] : []), ...(cats.includes('health') ? ['health', 'journal'] : [])].join(', ')}
              </Text>
            </>
          ) : (
            <>
              <Icon name="cloud-offline-outline" size={16} color={colors.accentText} />
              <Text style={[styles.stripText, { color: colors.accentText }]} numberOfLines={1}>
                AI is off. Coaching from your records only. Tap to change.
              </Text>
            </>
          )}
          {m.quota ? <Text style={styles.quota}>{`${m.quota.used}/${m.quota.cap}`}</Text> : null}
        </Pressable>

        {empty ? (
          <Animated.ScrollView entering={FadeInDown.duration(300)} contentContainerStyle={styles.emptyWrap} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <T variant="h1">
              {greeting(hourIST)}
              {state.name ? `, ${state.name}` : ''}.
            </T>
            <T variant="body" style={{ color: colors.muted }}>
              I only talk about what you have actually recorded. What do you want to work on?
            </T>

            <View style={[styles.nudge, { backgroundColor: toneBg }]}>
              <Text style={[styles.nudgeLabel, { color: toneFg }]}>KRISHNA'S NOTE RIGHT NOW</Text>
              <Text style={styles.nudgeTitle}>{nudge.title}</Text>
              <Text style={styles.nudgeBody}>{nudge.body}</Text>
              <Button compact kind={nudge.tone === 'firm' ? 'firm' : 'soft'} label="Talk about this" onPress={() => m.send(`${nudge.title}. Help me with this.`)} />
            </View>

            <View style={styles.grid}>
              {tiles.map((t) => (
                <Pressable
                  key={t.title}
                  style={({ pressed }) => [styles.tile, pressed && { transform: [{ scale: 0.97 }] }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.title}. ${t.sub}`}
                  onPress={() => {
                    tap();
                    t.run();
                  }}>
                  <View style={styles.tileIcon}>
                    <Icon name={t.icon} size={22} color={colors.primaryText} />
                  </View>
                  <Text style={styles.tileTitle}>{t.title}</Text>
                  <Text style={styles.tileSub}>{t.sub}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.ScrollView>
        ) : (
          <FlatList
            ref={listRef}
            data={m.messages}
            keyExtractor={(x) => x.id}
            renderItem={({ item }) => <Bubble msg={item} chatId={m.chat!.id} />}
            contentContainerStyle={{ padding: space(2.5), paddingBottom: space(2) }}
            ListFooterComponent={m.busy ? <TypingDots /> : undefined}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Composer */}
        <View style={[styles.composerWrap, { marginBottom: kb ? 8 : 96 }]}>
          {m.canFinish && !m.busy ? (
            <Button compact kind="gold" icon="✦" label="Wrap up and save what we decided" onPress={m.finish} style={{ alignSelf: 'center', marginBottom: 8 }} />
          ) : null}
          <View style={styles.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Tell Krishna what's happening…"
              placeholderTextColor={colors.muted}
              style={styles.input}
              multiline
              maxLength={1500}
              accessibilityLabel="Message to Krishna"
              onSubmitEditing={submit}
            />
            {text.trim() ? <IconButton icon="arrow-up" label="Send" tone="primary" onPress={submit} /> : <MicButton onText={(t) => { setText(''); m.send(t); }} onPartial={setText} hint={false} />}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space(2.5), paddingTop: space(0.5) },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.ink },
  sub: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.muted },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: space(2.5), paddingHorizontal: 12, minHeight: 36, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  stripText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primaryText },
  quota: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.muted },
  emptyWrap: { padding: space(2.5), gap: space(2), paddingBottom: space(4) },
  nudge: { borderRadius: radius.lg, padding: space(2.25), gap: space(1) },
  nudgeLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8 },
  nudgeTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  nudgeBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5) },
  tile: { flexBasis: '47.5%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: space(2), gap: 4, minHeight: 112, ...shadow.card },
  tileIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tileTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  tileSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  composerWrap: { paddingHorizontal: space(2), paddingTop: 6 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, backgroundColor: colors.surface, borderRadius: 28, paddingLeft: space(2), paddingRight: 4, paddingVertical: 4, ...shadow.card, borderWidth: 1, borderColor: colors.hairline },
  input: { flex: 1, minHeight: 44, maxHeight: 120, paddingTop: 10, paddingBottom: 10, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
});
