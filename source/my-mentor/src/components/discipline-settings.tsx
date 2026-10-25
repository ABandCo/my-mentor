// Settings for the discipline layer: who is using this phone (Arpan / Priya), targets, and the opt-in adaptive nudges.
import { Switch, TextInput, View, StyleSheet } from 'react-native';

import { Card, Chip, T } from '@/components/ui';
import { configOf, configRow } from '@/lib/discipline';
import { useStore } from '@/lib/store';
import { colors, radius, space } from '@/theme/tokens';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function TimeField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <T variant="caption">{label}</T>
      <TextInput
        defaultValue={value}
        key={value}
        maxLength={5}
        keyboardType="numbers-and-punctuation"
        onEndEditing={(e) => HHMM.test(e.nativeEvent.text) && onSave(e.nativeEvent.text)}
        style={s.input}
        accessibilityLabel={label}
      />
    </View>
  );
}

export function DisciplineSettings() {
  const { state, dispatch } = useStore();
  const cfg = configOf(state.collections);
  const save = (patch: Partial<typeof cfg>) => dispatch({ type: 'col/put', table: 'journal_entries', row: configRow({ ...cfg, ...patch }) });
  return (
    <Card style={{ gap: space(1.5) }}>
      <T variant="h2">Discipline & nudges</T>
      <T variant="caption">Yeh phone kiska hai? Nudges ki bhasha aur andaaz isse badalte hain.</T>
      <View style={s.chips}>
        <Chip label="Arpan" selected={cfg.role === 'arpan'} onPress={() => save({ role: 'arpan' })} />
        <Chip label="Priya" selected={cfg.role === 'priya'} onPress={() => save({ role: 'priya' })} />
      </View>
      <T variant="caption">Language / भाषा</T>
      <View style={s.chips}>
        {([['hi', 'हिन्दी'], ['en', 'English'], ['both', 'Both / दोनों']] as const).map(([v, label]) => (
          <Chip key={v} label={label} selected={cfg.nudgeLang === v} onPress={() => save({ nudgeLang: v })} />
        ))}
      </View>
      <View style={s.between}>
        <View style={{ flex: 1 }}>
          <T variant="body">Din bhar ke nudges (6 AM–11 PM)</T>
          <T variant="caption">Chhote, ek line ke. Ignore karoge toh khud kam ho jaate hain.</T>
        </View>
        <Switch value={cfg.nudgesOn} onValueChange={(v) => save({ nudgesOn: v })} />
      </View>
      {cfg.nudgesOn ? (
        <View style={s.chips}>
          {([15, 30, 60] as const).map((m) => (
            <Chip key={m} label={`${m} min`} selected={cfg.nudgeEvery === m} onPress={() => save({ nudgeEvery: m })} />
          ))}
        </View>
      ) : null}
      <View style={s.chips}>
        {[6, 8, 10].map((g) => (
          <Chip key={g} label={`${g} glass`} selected={cfg.waterTarget === g} onPress={() => save({ waterTarget: g })} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: space(1) }}>
        <TimeField label="Uthne ka target" value={cfg.wakeTarget} onSave={(v) => save({ wakeTarget: v })} />
        <TimeField label="Evening check-in" value={cfg.eveningCheckin} onSave={(v) => save({ eveningCheckin: v })} />
        <TimeField label="Detox cut-off" value={cfg.detoxCutoff} onSave={(v) => save({ detoxCutoff: v })} />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
  input: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.sm, padding: space(1.25), color: colors.ink, backgroundColor: colors.surface, textAlign: 'center' },
});
