import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bestStreak, habitStats, habitStreak, heatmap, isScheduled, lastStatuses, slippingHabits, weekdayOf, weekdayPattern } from '../src/lib/habit-stats.ts';

const TODAY = '2026-10-17'; // a Saturday
const habit = (over = {}) => ({ id: 'h', name: 'Walk', emoji: '🚶', createdAt: '2026-10-01T09:00:00+05:30', ...over });
const logs = (m: Record<string, string>) => ({ habitLogs: Object.fromEntries(Object.entries(m).map(([d, st]) => [d, { h: st }])) }) as never;

test('weekdayOf uses India time: 2026-10-17 is Saturday', () => {
  assert.equal(weekdayOf('2026-10-17'), 6);
  assert.equal(weekdayOf('2026-10-18'), 0);
});

test('schedule: no days means every day; days limit it', () => {
  assert.ok(isScheduled(habit(), '2026-10-14'));
  assert.ok(isScheduled(habit({ days: [1, 3] }), '2026-10-12')); // Monday
  assert.ok(!isScheduled(habit({ days: [1, 3] }), '2026-10-13')); // Tuesday
});

test('stats: unrecorded is separate, rest is excluded, today is not counted as unrecorded', () => {
  const s = logs({ '2026-10-11': 'done', '2026-10-12': 'missed', '2026-10-13': 'rest', '2026-10-14': 'partial', '2026-10-15': 'na' });
  const dates = ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'];
  const r = habitStats(s, habit(), dates, TODAY);
  assert.deepEqual(r, { scheduled: 7, done: 1, partial: 1, missed: 1, unrecorded: 1, excused: 2, eligible: 3, pct: 33 });
});

test('stats: days before the habit existed and unscheduled days are ignored', () => {
  const r = habitStats(logs({}), habit({ createdAt: '2026-10-16T08:00:00+05:30', days: [5, 6] }), ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'], TODAY);
  assert.equal(r.scheduled, 2); // Fri 16, Sat 17
  assert.equal(r.unrecorded, 1); // Fri; Saturday is today
});

test('stats: no records at all gives null percent, never 0', () => {
  assert.equal(habitStats(logs({}), habit(), ['2026-10-10', '2026-10-11'], TODAY).pct, null);
});

test('streak: consecutive done days, today unrecorded does not break it', () => {
  const s = logs({ '2026-10-14': 'done', '2026-10-15': 'done', '2026-10-16': 'done' });
  assert.equal(habitStreak(s, habit(), TODAY), 3);
  assert.equal(habitStreak(logs({ ...{ '2026-10-14': 'done', '2026-10-15': 'done', '2026-10-16': 'done', '2026-10-17': 'done' } }), habit(), TODAY), 4);
});

test('streak: a miss breaks it; rest and N/A days do not', () => {
  assert.equal(habitStreak(logs({ '2026-10-13': 'done', '2026-10-14': 'missed', '2026-10-15': 'done', '2026-10-16': 'done' }), habit(), TODAY), 2);
  assert.equal(habitStreak(logs({ '2026-10-13': 'done', '2026-10-14': 'rest', '2026-10-15': 'done', '2026-10-16': 'done' }), habit(), TODAY), 3);
});

test('streak: unscheduled days are skipped', () => {
  // Mon/Wed habit: Wed 14 and Mon 12 done, Tue and Thu-Fri are not scheduled.
  const s = logs({ '2026-10-12': 'done', '2026-10-14': 'done' });
  assert.equal(habitStreak(s, habit({ days: [1, 3] }), TODAY), 2);
});

test('best streak finds the longest run', () => {
  const s = logs({ '2026-10-02': 'done', '2026-10-03': 'done', '2026-10-04': 'done', '2026-10-05': 'missed', '2026-10-06': 'done', '2026-10-07': 'done' });
  assert.equal(bestStreak(s, habit(), TODAY), 3);
});

test('weekday pattern shows the weak weekday', () => {
  // Tuesdays (13th and 6th) missed, Mondays (12th and 5th) done
  const s = logs({ '2026-10-05': 'done', '2026-10-06': 'missed', '2026-10-12': 'done', '2026-10-13': 'missed' });
  const p = weekdayPattern(s, habit(), ['2026-10-05', '2026-10-06', '2026-10-12', '2026-10-13'], TODAY);
  assert.equal(p[1].pct, 100);
  assert.equal(p[2].pct, 0);
  assert.equal(p[0].pct, null);
});

test('heatmap counts habits done per day', () => {
  const s = { habitLogs: { '2026-10-16': { a: 'done', b: 'done', c: 'missed' }, '2026-10-17': { a: 'done' } } } as never;
  const hs = ['a', 'b', 'c'].map((id) => habit({ id }));
  assert.deepEqual(heatmap(s, hs, ['2026-10-16', '2026-10-17', '2026-10-18']), { '2026-10-16': 2, '2026-10-17': 1, '2026-10-18': 0 });
});

test('lastStatuses returns oldest first with nulls for no record', () => {
  const s = logs({ '2026-10-16': 'done', '2026-10-15': 'missed' });
  assert.deepEqual(lastStatuses(s, habit(), 3, TODAY), ['missed', 'done', null]);
});

test('slipping habits: needs enough records and under 50% done, worst first', () => {
  const h1 = habit({ id: 'a', name: 'A' });
  const h2 = habit({ id: 'b', name: 'B' });
  const s = {
    habitLogs: {
      '2026-10-12': { a: 'missed', b: 'missed' },
      '2026-10-13': { a: 'missed', b: 'missed' },
      '2026-10-14': { a: 'done', b: 'missed' },
      '2026-10-15': { a: 'missed', b: 'missed' },
    },
  } as never;
  const r = slippingHabits(s, [h1, h2], TODAY);
  assert.deepEqual(r.map((x) => x.h.name), ['B', 'A']); // B 0% done, A 25% done
});
