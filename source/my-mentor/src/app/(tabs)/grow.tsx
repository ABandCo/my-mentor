import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, Pill } from '@/components/kit';
import { Card, T, tap } from '@/components/ui';
import { attemptsOf, trend } from '@/lib/comm-lab';
import { dueList } from '@/lib/business';
import { goalsOf, paceOf } from '@/lib/goals';
import { dateKey, level } from '@/lib/metrics';
import { useStore } from '@/lib/store';
import { colors, fonts, space } from '@/theme/tokens';

export default function Grow() {
  const { state } = useStore();
  const today = dateKey();
  const tr = trend(attemptsOf(state.collections));
  const goals = goalsOf(state.collections).filter((g) => g.status === 'active');
  const behind = goals.filter((g) => ['behind', 'overdue'].includes(paceOf(g, goals, today).pace)).length;
  const due = dueList(today, state.collections, 7, 10).filter((o) => !o.done);
  const overdue = due.filter((o) => o.daysLeft < 0).length;
  const lv = level(state.xp);

  const items = [
    { emoji: '🎙️', title: 'Communication Lab', hi: 'संवाद अभ्यास', body: 'Speak or type real scenarios. Fixed rubric, retries, score trends.', pill: tr.count ? `${tr.count} rounds${tr.last !== null ? ` · ${tr.last}%` : ''}` : 'Start a 5-minute drill', tone: 'sage' as const, bg: colors.primarySoft, route: '/comm-lab' },
    { emoji: '🎯', title: 'Goals', hi: 'लक्ष्य', body: 'Year to week. Progress rolls up. Krishna breaks goals into steps.', pill: goals.length ? `${goals.length} active${behind ? ` · ${behind} behind` : ''}` : 'Set your first goal', tone: behind ? ('gold' as const) : ('sand' as const), bg: colors.surface, route: '/goals' },
    { emoji: '🗓️', title: 'Planner', hi: 'दिनचर्या', body: 'Plan the day, set reminders before timed items.', pill: 'Open today', tone: 'sand' as const, bg: colors.surface, route: '/planner' },
    { emoji: '💼', title: 'Work & Business', hi: 'प्रैक्टिस ग्रोथ', body: 'Growth actions, time use, delegation advice, due dates, weekly plan.', pill: overdue ? `${overdue} overdue` : due.length ? `${due.length} due this week` : 'All clear', tone: overdue ? ('firm' as const) : ('sand' as const), bg: colors.accentSoft, route: '/work' },
    { emoji: '💞', title: 'Couple Space', hi: 'साथ में', body: 'Daily acts, conversation guides, rituals, repair scripts, and a private shared space.', pill: 'Open', tone: 'sand' as const, bg: colors.surfaceAlt, route: '/couple' },
    { emoji: '📊', title: 'Reports & rewards', hi: 'रिपोर्ट', body: 'Weekly, monthly and 30-day reviews. PDF export, badges, Weekly Wins.', pill: `Level ${lv.lvl} · ${state.xp} XP`, tone: 'gold' as const, bg: colors.surface, route: '/reports' },
    { emoji: '🧠', title: 'What Krishna remembers', hi: 'याददाश्त', body: 'See, edit or delete everything Krishna remembers about you.', pill: 'Privacy', tone: 'sand' as const, bg: colors.surface, route: '/memory' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <T variant="h1" hi="आगे बढ़ें">
          Grow
        </T>
        {items.map((m, i) => (
          <Animated.View key={m.title} entering={FadeInDown.delay(i * 40).duration(300)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${m.title}. ${m.body}`}
              onPress={() => {
                tap();
                router.push(m.route as never);
              }}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
              <Card style={[styles.card, { backgroundColor: m.bg }]}>
                <Text style={{ fontSize: 32 }}>{m.emoji}</Text>
                <View style={{ flex: 1, gap: 4 }}>
                  <T variant="h2" hi={m.hi}>
                    {m.title}
                  </T>
                  <T variant="body" style={{ color: colors.muted }}>
                    {m.body}
                  </T>
                  <View style={{ flexDirection: 'row' }}>
                    <Pill label={m.pill} tone={m.tone} />
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.muted} />
              </Card>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space(2.5), paddingBottom: 140, gap: space(1.75), maxWidth: 640, width: '100%', alignSelf: 'center' },
  card: { flexDirection: 'row', gap: space(2), alignItems: 'center' },
});
void fonts;
