// Networking list: who to keep in touch with, how often, and who is due. This builds a strong career.
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Chip, T, tap } from '@/components/ui';
import { dateKey } from '@/lib/metrics';
import { dueContacts, FREQUENCIES, peopleOf, personRow } from '@/lib/network';
import { uid, useStore } from '@/lib/store';
import { colors, radius, space } from '@/theme/tokens';

export function PeopleCard() {
  const { state, dispatch } = useStore();
  const today = dateKey();
  const people = peopleOf(state.collections);
  const due = dueContacts(people, today);
  const [name, setName] = useState('');
  const [every, setEvery] = useState<number>(14);
  return (
    <Card style={{ gap: space(1.25) }}>
      <T variant="label">NETWORK · MAZBOOT CAREER KI NEEV</T>
      <T variant="caption">Dost, clients, mentors: jinse milna ya baat karna tumhe aage badhayega. Dinner meet plan karo.</T>
      {people.length === 0 ? <T variant="body">Abhi koi nahi. Neeche 3 naam jodo.</T> : null}
      {people.map((p) => {
        const d = due.find((x) => x.person.id === p.id);
        return (
          <View key={p.id} style={s.row}>
            <View style={{ flex: 1 }}>
              <T variant="body">{p.name}</T>
              <T variant="caption" style={{ color: d ? colors.firmText : colors.muted }}>
                har {p.everyDays} din · {p.lastContact ? `last: ${p.lastContact}` : 'abhi tak nahi'}{d && d.daysSince !== null ? ` · ${d.daysSince} din ho gaye` : ''}
              </T>
            </View>
            <Button compact kind={d ? 'gold' : 'soft'} label="Baat ho gayi" onPress={() => { tap('success'); dispatch({ type: 'col/put', table: 'journal_entries', row: { id: p.id, lastContact: today } }); }} />
          </View>
        );
      })}
      <View style={s.chips}>
        {FREQUENCIES.map((f) => <Chip key={f} label={`har ${f} din`} selected={every === f} onPress={() => setEvery(f)} />)}
      </View>
      <View style={s.row}>
        <TextInput value={name} onChangeText={setName} placeholder="Naam (dost / client / mentor)" placeholderTextColor={colors.muted} style={[s.input, { flex: 1 }]} maxLength={40} />
        <Button compact kind="soft" label="Add" disabled={!name.trim()} onPress={() => { dispatch({ type: 'col/put', table: 'journal_entries', row: personRow(uid(), name, every) }); setName(''); }} />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.sm, padding: space(1.5), color: colors.ink, backgroundColor: colors.surface },
});
