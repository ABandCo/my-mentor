import assert from 'node:assert/strict';
import { test } from 'node:test';

import { inWindow, planNotifications } from '../src/lib/notification-plan.ts';

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
  aiConsentGeneral: false,
  aiConsentSensitive: false,
  baselines: {},
} as const;
type P = Parameters<typeof planNotifications>[0];
const p = (over: Partial<P> = {}) => ({ ...profile, ...over }) as P;
const ist = (s: string) => new Date(`${s}+05:30`);
const istClock = (d: Date) => new Date(d.getTime() + 330 * 60000).toISOString().slice(11, 16);

test('a full day from 05:00: morning, 11 hourly (10:00..20:00), evening', () => {
  const plan = planNotifications(p(), { enabled: true }, ist('2026-10-17T05:00:00')).filter((x) => x.at < ist('2026-10-18T00:00:00'));
  assert.deepEqual(
    plan.map((x) => `${x.data.kind}@${istClock(x.at)}`),
    ['morning@06:45', ...Array.from({ length: 11 }, (_, i) => `hourly@${String(10 + i).padStart(2, '0')}:00`), 'evening@21:30'],
  );
});

test('hourly asks about the hour that just ended', () => {
  const plan = planNotifications(p(), { enabled: true }, ist('2026-10-17T05:00:00'));
  const ten = plan.find((x) => istClock(x.at) === '10:00')!;
  assert.equal(ten.data.key, '2026-10-17:09');
  assert.equal(ten.title, '09:00–10:00 check-in');
  assert.equal(ten.category, 'hourly');
});

test('nothing in the past is scheduled', () => {
  const now = ist('2026-10-17T14:20:00');
  const plan = planNotifications(p(), { enabled: true }, now);
  assert.ok(plan.every((x) => x.at > now));
  assert.equal(istClock(plan[0].at), '15:00');
});

test('three days ahead, then stops', () => {
  const plan = planNotifications(p(), { enabled: true, weeklyReview: false }, ist('2026-10-17T05:00:00'));
  assert.equal(plan.length, 13 * 3);
  assert.ok(plan[plan.length - 1].at < ist('2026-10-20T00:00:00'));
});

test('weekly planning review is scheduled on Sunday 18:00 IST only', () => {
  const plan = planNotifications(p(), { enabled: true }, ist('2026-10-17T05:00:00')).filter((x) => x.data.kind === 'weekly');
  assert.equal(plan.length, 1);
  assert.equal(istClock(plan[0].at), '18:00');
  assert.equal(plan[0].data.day, '2026-10-18'); // 18 Oct 2026 is a Sunday
});

test('pre-event reminder fires 15 minutes before a timed planner item', () => {
  const plan = planNotifications(p(), { enabled: true }, ist('2026-10-17T05:00:00'), { events: [{ day: '2026-10-17', time: '15:00', title: 'Client call' }] });
  const ev = plan.find((x) => x.data.kind === 'event')!;
  assert.equal(istClock(ev.at), '14:45');
  assert.match(ev.title, /Client call/);
  assert.equal(planNotifications(p(), { enabled: true, preEvent: false }, ist('2026-10-17T05:00:00'), { events: [{ day: '2026-10-17', time: '15:00', title: 'x' }] }).filter((x) => x.data.kind === 'event').length, 0);
});

test('ease-off: after 3 ignored check-ins, hourly nudges thin out; follow-up appears once', () => {
  const now = ist('2026-10-17T12:10:00');
  const normal = planNotifications(p(), { enabled: true }, now).filter((x) => x.data.kind === 'hourly' && x.at < ist('2026-10-18T00:00:00')).length;
  const eased = planNotifications(p(), { enabled: true }, now, { ignoredRecent: 3 });
  assert.ok(eased.filter((x) => x.data.kind === 'hourly' && x.at < ist('2026-10-18T00:00:00')).length < normal);
  assert.equal(eased.filter((x) => x.data.kind === 'followup').length, 1);
  const off = planNotifications(p(), { enabled: true, easeOff: false, followUp: false }, now, { ignoredRecent: 5 });
  assert.equal(off.filter((x) => x.data.kind === 'hourly' && x.at < ist('2026-10-18T00:00:00')).length, normal);
  assert.equal(off.filter((x) => x.data.kind === 'followup').length, 0);
});

test('quiet hours suppress anything inside them', () => {
  const plan = planNotifications(p({ quietStart: '13:00', quietEnd: '15:00' }), { enabled: true }, ist('2026-10-17T05:00:00'));
  const clocks = plan.filter((x) => x.at < ist('2026-10-18T00:00:00')).map((x) => istClock(x.at));
  assert.ok(!clocks.includes('13:00') && !clocks.includes('14:00'));
  assert.ok(clocks.includes('15:00'));
});

test('pause skips until the pause ends', () => {
  const now = ist('2026-10-17T10:30:00');
  const plan = planNotifications(p(), { enabled: true, pausedUntil: ist('2026-10-17T13:00:00').toISOString() }, now);
  assert.equal(istClock(plan[0].at), '13:00');
});

test('disabled schedules nothing', () => {
  assert.equal(planNotifications(p(), { enabled: false }).length, 0);
});

test('quiet window across midnight', () => {
  assert.ok(inWindow(23 * 60, 22 * 60 + 30, 6 * 60 + 30));
  assert.ok(inWindow(3 * 60, 22 * 60 + 30, 6 * 60 + 30));
  assert.ok(!inWindow(12 * 60, 22 * 60 + 30, 6 * 60 + 30));
});

test('sleep after midnight puts evening review late the same evening', () => {
  const plan = planNotifications(p({ sleep: '00:30', quietStart: '01:00', quietEnd: '06:30' }), { enabled: true }, ist('2026-10-17T05:00:00'));
  const ev = plan.find((x) => x.data.kind === 'evening')!;
  assert.equal(ev.at.toISOString(), ist('2026-10-17T23:30:00').toISOString());
});
