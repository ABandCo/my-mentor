// Run: node --test tests/   (Node 24 runs TypeScript directly)
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { adherence, dateKey, lastNDates, level, streaks } from '../src/lib/metrics.ts';

type S = Parameters<typeof adherence>[0];
const base = (): S =>
  ({
    hydrated: true,
    name: '',
    profile: {} as S['profile'],
    oneThing: {},
    hours: {},
    habits: [],
    habitLogs: {},
    commitments: [],
    mood: {},
    xp: 0,
    outbox: [],
  }) as S;

const TODAY = '2026-10-17';
const at = new Date(`${TODAY}T12:00:00+05:30`);

test('dateKey uses India time regardless of UTC date', () => {
  // 20:00 UTC on the 16th is 01:30 IST on the 17th
  assert.equal(dateKey(new Date('2026-10-16T20:00:00Z')), '2026-10-17');
  assert.equal(dateKey(new Date('2026-10-17T18:29:00Z')), '2026-10-17'); // 23:59 IST
  assert.equal(dateKey(new Date('2026-10-17T18:30:00Z')), '2026-10-18'); // 00:00 IST
});

test('istHour reads the India wall clock', async () => {
  const { istHour } = await import('../src/lib/metrics.ts');
  assert.equal(istHour(new Date('2026-10-16T20:00:00Z')), 1);
  assert.equal(istHour(new Date('2026-10-17T03:30:00Z')), 9);
});

test('adherence: unrecorded, rest and N/A are excluded and reported separately', () => {
  const s = base();
  s.habits = [{ id: 'w', name: 'Water', emoji: '💧', createdAt: '2026-10-10T00:00:00+05:30' }];
  const days = lastNDates(7, at); // 11..17
  s.habitLogs = {
    '2026-10-11': { w: 'done' },
    '2026-10-12': { w: 'missed' },
    '2026-10-13': { w: 'rest' },
    '2026-10-14': { w: 'partial' },
    '2026-10-15': { w: 'na' },
    // 16, 17 unrecorded
  };
  const a = adherence(s, days);
  assert.deepEqual(a, { pct: 33, eligible: 3, done: 1, partial: 1, missed: 1, unrecorded: 2, excused: 2 });
});

test('adherence: days before a habit existed are not counted', () => {
  const s = base();
  s.habits = [{ id: 'w', name: 'Water', emoji: '💧', createdAt: '2026-10-16T09:00:00+05:30' }];
  s.habitLogs = { '2026-10-16': { w: 'done' } };
  const a = adherence(s, lastNDates(7, at));
  assert.equal(a.eligible, 1);
  assert.equal(a.unrecorded, 1); // only today
  assert.equal(a.pct, 100);
});

test('adherence: no data gives null, never 0%', () => {
  assert.equal(adherence(base(), lastNDates(7, at)).pct, null);
});

const active = (s: S, d: string) => (s.oneThing[d] = { text: 'x', done: true });

test('streak: today not yet active does not break the streak', () => {
  const s = base();
  ['2026-10-14', '2026-10-15', '2026-10-16'].forEach((d) => active(s, d));
  assert.equal(streaks(s, TODAY).streak, 3);
});

test('streak: one missed day in a week is shielded, a second breaks it', () => {
  const s = base();
  ['2026-10-10', '2026-10-11', '2026-10-13', '2026-10-14', '2026-10-16'].forEach((d) => active(s, d));
  // 15 missed (shield), 12 missed within 7 days of that shield -> break
  assert.equal(streaks(s, TODAY).streak, 3);
});

test('comebacks: first ever day is not a comeback; return after 2+ day gap is', () => {
  const s = base();
  active(s, '2026-10-10');
  assert.equal(streaks(s, TODAY).comebacks, 0);
  active(s, '2026-10-14'); // gap of 11,12,13
  assert.equal(streaks(s, TODAY).comebacks, 1);
  active(s, '2026-10-16'); // gap of 1 day only
  assert.equal(streaks(s, TODAY).comebacks, 1);
});

test('level curve', () => {
  assert.deepEqual(level(0), { lvl: 1, progress: 0, toNext: 50 });
  assert.equal(level(50).lvl, 2);
  assert.equal(level(199).lvl, 2);
  assert.equal(level(200).lvl, 3);
});
