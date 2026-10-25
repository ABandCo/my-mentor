import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Bars, HBar } from '@/components/charts';
import { Icon, IconButton, Pill, ScreenHeader, StatTile } from '@/components/kit';
import { Card, Chip, SectionTitle, T } from '@/components/ui';
import { AREAS, type Area, attemptsOf, CRITERIA, dailyDrill, SCENARIOS, trend, weeklyExercise } from '@/lib/comm-lab';
import { dateKey } from '@/lib/metrics';
import { useStore } from '@/lib/store';
import { colors, fonts, space } from '@/theme/tokens';

export default function CommLab() {
  const { state } = useStore();
  const today = dateKey();
  const attempts = attemptsOf(state.collections);
  const tr = trend(attempts);
  const drill = dailyDrill(attempts, today);
  const wk = weeklyExercise(today);
  const [area, setArea] = useState<Area | 'all'>('all');
  const best = (id: string) => Math.max(0, ...attempts.filter((a) => a.scenarioId === id).map((a) => a.percent));
  const tries = (id: string) => attempts.filter((a) => a.scenarioId === id).length;
  const doneToday = attempts.filter((a) => a.createdAt.slice(0, 10) === today).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Communication Lab" hi="संवाद अभ्यास" left={<IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />} />
        <T variant="body" style={{ color: colors.muted }}>
          Practise real situations. Speak or type, get scored on five fixed criteria, and try again until it feels natural.
        </T>

        <View style={{ flexDirection: 'row', gap: space(1.5) }}>
          <StatTile tone="sage" value={String(tr.count)} label="Attempts" />
          <StatTile tone="honey" value={tr.last === null ? '—' : `${tr.last}%`} label="Recent average" />
          <StatTile value={tr.change === null ? '—' : `${tr.change > 0 ? '+' : ''}${tr.change}`} label="Change" sub={tr.change === null ? 'after 6 tries' : 'vs first 3'} />
        </View>

        <Card tone="honey" style={{ gap: space(1.5) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T variant="label" style={{ color: colors.accentText }}>
              TODAY'S 5-MINUTE DRILL
            </T>
            <Pill label={doneToday >= 3 ? 'Done for today ✓' : `${Math.min(3, doneToday)}/3`} tone={doneToday >= 3 ? 'sage' : 'gold'} />
          </View>
          {drill.map((s) => (
            <Pressable key={s.id} onPress={() => router.push({ pathname: '/comm-practice', params: { id: s.id } })} style={styles.drillRow} accessibilityRole="button" accessibilityLabel={`Practise ${s.title}`}>
              <Text style={{ fontSize: 22 }}>{AREAS.find((a) => a.key === s.area)?.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.sTitle}>{s.title}</Text>
                <Text style={styles.sSub}>{s.seconds} seconds · {AREAS.find((a) => a.key === s.area)?.label}</Text>
              </View>
              <Icon name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </Card>

        <Card style={{ gap: 6 }}>
          <T variant="label">THIS WEEK'S EXERCISE · {wk.area.label.toUpperCase()}</T>
          <T variant="title">{wk.text}</T>
        </Card>

        {tr.count >= 2 ? (
          <Card style={{ gap: space(1.5) }}>
            <SectionTitle title="Your scores over time" />
            <Bars color={colors.primary} suffix="%" items={tr.series.map((v, i) => ({ label: String(i + 1), value: v }))} height={80} />
            {tr.weakest ? <T variant="caption">Weakest criterion so far: {CRITERIA.find((c) => c.key === tr.weakest!.key)?.label} ({tr.weakest.avg}/5). {CRITERIA.find((c) => c.key === tr.weakest!.key)?.hint}.</T> : null}
            {tr.byCriterion.map((c) => (
              <HBar key={c.key} label={CRITERIA.find((x) => x.key === c.key)!.label} value={c.avg ?? 0} max={5} color={colors.primary} right={c.avg === null ? '—' : `${c.avg}/5`} />
            ))}
          </Card>
        ) : null}

        <SectionTitle title="Scenario library" />
        <View style={styles.wrap}>
          <Chip label="All" selected={area === 'all'} onPress={() => setArea('all')} />
          {AREAS.map((a) => (
            <Chip key={a.key} label={`${a.emoji} ${a.label}`} selected={area === a.key} onPress={() => setArea(a.key)} />
          ))}
        </View>
        {SCENARIOS.filter((s) => area === 'all' || s.area === area).map((s) => (
          <Pressable key={s.id} onPress={() => router.push({ pathname: '/comm-practice', params: { id: s.id } })} accessibilityRole="button" accessibilityLabel={`${s.title}. ${s.setup}`}>
            <Card style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={[styles.sTitle, { flex: 1 }]}>{s.title}</Text>
                {tries(s.id) ? <Pill label={`Best ${best(s.id)}%`} tone="sage" /> : <Pill label={`Level ${s.level}`} tone="sand" />}
              </View>
              <T variant="body" style={{ color: colors.muted }}>
                {s.setup}
              </T>
              {tries(s.id) ? <T variant="caption">{tries(s.id)} attempt{tries(s.id) > 1 ? 's' : ''}</T> : null}
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space(2.5), paddingBottom: space(6), gap: space(2), maxWidth: 640, width: '100%', alignSelf: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  drillRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), backgroundColor: colors.surface, borderRadius: 18, padding: space(1.5), minHeight: 60 },
  sTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  sSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
});
