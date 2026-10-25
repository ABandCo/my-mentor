import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildContext, contextCategories } from '../src/lib/ai/context.ts';
import { offlineCoach } from '../src/lib/ai/offline-coach.ts';

const NOW = new Date('2026-10-17T16:30:00+05:30'); // Saturday, 4:30 pm IST

const profile = {
  language: 'en',
  coachingStyle: 'strict',
  focusAreas: [],
  wake: '06:30',
  sleep: '22:30',
  intensiveStart: '09:00',
  intensiveEnd: '20:00',
  quietStart: '22:30',
  quietEnd: '06:30',
  aiConsentGeneral: true,
  aiConsentSensitive: false,
  baselines: { sleepHours: 6.5 },
};
const mk = (over: Record<string, unknown> = {}) =>
  ({
    hydrated: true,
    collections: {},
    chats: [],
    prefs: { maskNames: [], transcriptDays: 30, haptics: true, sounds: false },
    name: 'Arpan',
    profile,
    oneThing: {},
    hours: {},
    habits: [],
    habitLogs: {},
    commitments: [],
    mood: {},
    xp: 0,
    outbox: [],
    notif: { enabled: true },
    ...over,
  }) as never;

const habit = (id: string, name: string) => ({ id, name, emoji: '🎯', createdAt: '2026-10-01T09:00:00+05:30' });
const dayLogs = (id: string, m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([d, st]) => [d, { [id]: st }]));

test('consent decides which categories may be built', () => {
  assert.deepEqual(contextCategories({ ...profile, aiConsentGeneral: false } as never), []);
  assert.deepEqual(contextCategories(profile as never), ['plans', 'work']);
  assert.deepEqual(contextCategories({ ...profile, aiConsentSensitive: true } as never), ['plans', 'work', 'health', 'journal']);
});

test('without the plans category nothing is built', () => {
  assert.deepEqual(buildContext(mk(), ['work'], NOW), {});
});

test('empty records are reported as "not set / not recorded", never invented', () => {
  const c = buildContext(mk(), ['plans'], NOW) as Record<string, any>;
  assert.equal(c.today.oneThing, 'not set');
  assert.equal(c.today.energy1to5, 'not recorded');
  assert.equal(c.week.habitAdherencePct, null);
  assert.deepEqual(c.habits, []);
  assert.deepEqual(c.profile.baselinesEnteredByUser, { sleepHours: 6.5 });
  assert.equal(c.health, undefined);
  assert.equal(c.journal, undefined);
});

test('today and habit facts come straight from the records', () => {
  const s = mk({
    oneThing: { '2026-10-17': { text: 'File GST reply', done: false } },
    hours: { '2026-10-17:10': { plan: 'Draft', status: 'done' }, '2026-10-17:11': { plan: 'Call', status: 'missed' } },
    habits: [habit('w', 'Water')],
    habitLogs: dayLogs('w', { '2026-10-16': 'done', '2026-10-15': 'done', '2026-10-17': 'done' }),
    mood: { '2026-10-17': 4 },
  });
  const c = buildContext(s, ['plans'], NOW) as Record<string, any>;
  assert.equal(c.today.weekday, 'Saturday');
  assert.deepEqual(c.today.oneThing, { text: 'File GST reply', done: false });
  assert.deepEqual(c.today.hourCheckIns.map((h: any) => h.status), ['done', 'missed']);
  assert.equal(c.today.energy1to5, 4);
  assert.deepEqual(c.today.habits, [{ name: 'Water', status: 'done' }]);
  assert.equal(c.habits[0].currentStreak, 3);
  assert.deepEqual(c.habits[0].last7.slice(-3), ['done', 'done', 'done']);
});

test('slipping habits and the weakest weekday are surfaced', () => {
  const s = mk({
    habits: [habit('g', 'Gym')],
    habitLogs: dayLogs('g', { '2026-10-06': 'missed', '2026-10-13': 'missed', '2026-10-12': 'done', '2026-10-05': 'done', '2026-10-14': 'missed', '2026-10-15': 'missed' }),
  });
  const c = buildContext(s, ['plans'], NOW) as Record<string, any>;
  assert.match(c.habits[0].weakestWeekday, /Tuesday \(0\/2 done\)/);
  assert.deepEqual(c.week.habitsSlippingUnder50pct, ['Gym']);
});

test('only open commitments are included and overdue is flagged', () => {
  const s = mk({
    commitments: [
      { id: '1', text: 'Send proposal', due: '2026-10-15', done: false, createdAt: 'x' },
      { id: '2', text: 'Done thing', done: true, createdAt: 'x' },
      { id: '3', text: 'Later', due: '2026-10-30', done: false, createdAt: 'x' },
    ],
  });
  const c = buildContext(s, ['plans'], NOW) as Record<string, any>;
  assert.equal(c.commitments.length, 2);
  assert.equal(c.commitments[0].overdue, true);
  assert.equal(c.commitments[1].overdue, false);
});

test('context stays small', () => {
  const habits = Array.from({ length: 8 }, (_, i) => habit(`h${i}`, `Habit ${i}`));
  const logs: Record<string, Record<string, string>> = {};
  for (let d = 1; d <= 17; d++) logs[`2026-10-${String(d).padStart(2, '0')}`] = Object.fromEntries(habits.map((h) => [h.id, d % 3 ? 'done' : 'missed']));
  const c = buildContext(mk({ habits, habitLogs: logs }), ['plans'], NOW);
  assert.ok(JSON.stringify(c).length < 7000, `context is ${JSON.stringify(c).length} chars`);
});

// ---------- offline coach ----------
test('coach: brand-new user is told to start small', () => {
  assert.equal(offlineCoach(mk(), NOW).id, 'start');
});

test('coach: three missed hours today triggers a reset, not a scolding', () => {
  const hours = { '2026-10-17:10': { plan: 'a', status: 'missed' }, '2026-10-17:11': { plan: 'b', status: 'missed' }, '2026-10-17:12': { plan: 'c', status: 'missed' } };
  const n = offlineCoach(mk({ hours, habits: [habit('w', 'Water')] }), NOW);
  assert.equal(n.id, 'reset');
  assert.match(n.body, /don't need to repair the whole day/);
});

test('coach: a slipping habit gets a strict, specific, number-backed push and one question', () => {
  const s = mk({
    habits: [habit('g', 'Gym')],
    habitLogs: dayLogs('g', { '2026-10-12': 'missed', '2026-10-13': 'missed', '2026-10-14': 'missed', '2026-10-15': 'done' }),
  });
  const n = offlineCoach(s, NOW);
  assert.equal(n.id, 'slip-g');
  assert.match(n.body, /done on 1 of 4 recorded days/);
  assert.match(n.body, /smallest version/);
  assert.equal(n.tone, 'firm');
  assert.ok(!/lazy|weak|pathetic/i.test(n.body));
});

test('coach: gentle style softens the same facts', () => {
  const s = mk({
    profile: { ...profile, coachingStyle: 'gentle' },
    habits: [habit('g', 'Gym')],
    habitLogs: dayLogs('g', { '2026-10-12': 'missed', '2026-10-13': 'missed', '2026-10-14': 'missed', '2026-10-15': 'done' }),
  });
  assert.match(offlineCoach(s, NOW).body, /What would make it easier/);
});

test('coach: overdue commitments and a One Thing not done after 3 pm', () => {
  const overdue = mk({ habits: [habit('w', 'Water')], commitments: [{ id: '1', text: 'Send proposal', due: '2026-10-15', done: false, createdAt: 'x' }] });
  assert.equal(offlineCoach(overdue, NOW).id, 'overdue');
  const late = mk({ habits: [habit('w', 'Water')], oneThing: { '2026-10-17': { text: 'GST reply', done: false } } });
  assert.equal(offlineCoach(late, NOW).id, 'onenotdone');
});

test('coach: celebrates only what is actually recorded', () => {
  const m: Record<string, string> = {};
  for (let d = 10; d <= 16; d++) m[`2026-10-${d}`] = 'done';
  const s = mk({ habits: [habit('r', 'Read')], habitLogs: dayLogs('r', m), oneThing: { '2026-10-17': { text: 'x', done: true } } });
  const n = offlineCoach(s, NOW);
  assert.equal(n.tone, 'celebrate');
  assert.match(n.body, /done 7 of 7 recorded days \(100%\)/);
});
