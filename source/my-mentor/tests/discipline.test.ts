import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_CONFIG, configOf, configRow, detoxStreak, disciplineScore, eveningRow, glassesFromText, lateByMin, shouldRecordWake, waterOn, waterRow, waterStreak, waterTotals, wakeRow,
} from '../src/lib/discipline.ts';
import { eveningAccountability, lateWakeLine, nudgeGap, nudgeTimes, pickNudge, slotOf, timeUseFlag } from '../src/lib/nudges.ts';
import { planNotifications } from '../src/lib/notification-plan.ts';

const put = (cols: any, r: any) => ({ ...cols, journal_entries: { ...(cols.journal_entries ?? {}), [r.id]: { createdAt: 'x', updatedAt: 'x', ...r } } });
const ist = (s: string) => new Date(`${s}+05:30`);

test('water: count, cap, streak and totals', () => {
  let c: any = {};
  assert.equal(waterOn(c, '2026-10-25'), 0);
  for (const [d, g] of [['2026-10-23', 8], ['2026-10-24', 9], ['2026-10-25', 3]] as const) c = put(c, waterRow(d, g));
  assert.equal(waterRow('d', -3).glasses, 0);
  assert.equal(waterRow('d', 99).glasses, 30);
  assert.equal(waterStreak(c, 8, '2026-10-25'), 2); // today still open, not a break
  assert.deepEqual(waterTotals(c, '2026-10-25'), { week: 20, month: 20 });
  c = put(c, { ...waterRow('2026-10-23', 8), deletedAt: 'y' });
  assert.equal(waterOn(c, '2026-10-23'), 0);
});

test('glasses from chat text', () => {
  assert.equal(glassesFromText('drank two glasses'), 2);
  assert.equal(glassesFromText('3 glass paani piya'), 3);
  assert.equal(glassesFromText('ek glass water'), 1);
  assert.equal(glassesFromText('I went for a walk'), null);
});

test('config defaults and clamping; nudges are opt-in', () => {
  assert.equal(configOf({}).nudgesOn, false);
  const c = configOf(put({}, configRow({ waterTarget: 99, role: 'priya', nudgeEvery: 15, nudgesOn: true })).journal_entries ? put({}, configRow({ waterTarget: 99, role: 'priya', nudgeEvery: 15, nudgesOn: true })) : {});
  assert.equal(c.waterTarget, 20);
  assert.equal(c.role, 'priya');
  assert.equal(c.nudgeEvery, 15);
  assert.deepEqual(DEFAULT_CONFIG.workDays, [1, 2, 3, 4, 5, 6]);
});

test('wake: records once after 05:00, lateness', () => {
  assert.equal(shouldRecordWake({}, ist('2026-10-25T04:30:00')), false);
  assert.equal(shouldRecordWake({}, ist('2026-10-25T08:40:00')), true);
  assert.equal(shouldRecordWake(put({}, wakeRow('2026-10-25', '08:40')), ist('2026-10-25T09:00:00')), false);
  assert.equal(lateByMin('08:40', '06:00'), 160);
  assert.equal(lateByMin('05:50', '06:00'), 0);
  assert.match(lateWakeLine('08:40', 160)!, /Kal ka din mushkil/);
  assert.equal(lateWakeLine('06:10', 10), null);
});

test('detox streak ignores an unanswered today', () => {
  let c: any = {};
  for (const d of ['2026-10-23', '2026-10-24']) c = put(c, eveningRow({ date: d, detoxFree: true, shipped: 'x', fix: 'y' }));
  assert.equal(detoxStreak(c, '2026-10-25'), 2);
  c = put(c, eveningRow({ date: '2026-10-25', detoxFree: false, shipped: '', fix: '' }));
  assert.equal(detoxStreak(c, '2026-10-25'), 0);
});

test('discipline score: honest on empty plan, bonus capped', () => {
  assert.equal(disciplineScore({ planned: 0, done: 0, streakDays: 5, detoxStreak: 0, waterMet: true }).score, null);
  const s = disciplineScore({ planned: 4, done: 2, streakDays: 3, detoxStreak: 0, waterMet: false });
  assert.deepEqual([s.base, s.bonus, s.score], [50, 3, 53]);
  assert.equal(disciplineScore({ planned: 2, done: 2, streakDays: 30, detoxStreak: 9, waterMet: true }).score, 100);
});

test('nudges: window, Priya rules, adaptive gap', () => {
  assert.equal(slotOf(5), null);
  assert.equal(slotOf(23), null);
  const base = { openToday: 2, waterGlasses: 0, waterTarget: 8 };
  for (let h = 6; h < 23; h++)
    for (const m of [0, 15, 30, 45]) {
      const p = pickNudge({ ...base, role: 'priya', hour: h, minute: m })!;
      assert.match(p.body, /Arpan/, `Priya ${h}:${m} names Arpan`);
      assert.match(p.body, /baat hui/, 'asks if discussed');
      assert.match(p.body, /karwa rahi ho ya akeli/, 'asks delegating or alone');
      assert.doesNotMatch(p.body + p.title, /kg|moti|fat|weight|diabetes/i, 'no body/weight talk');
      const a = pickNudge({ ...base, role: 'arpan', hour: h, minute: m })!;
      assert.ok(a.body.length <= 120 && a.title.length <= 30);
    }
  assert.equal(pickNudge({ ...base, role: 'arpan', hour: 3, minute: 0 }), null);
  assert.equal(nudgeGap({ nudgeEvery: 15 }, 0, false), 15);
  assert.equal(nudgeGap({ nudgeEvery: 15 }, 3, false), 30);
  assert.equal(nudgeGap({ nudgeEvery: 15 }, 3, true), 120);
  const t = nudgeTimes(60);
  assert.equal(t[0], 360);
  assert.ok(t.every((m) => m >= 360 && m < 1380));
});

test('evening accountability + time-use cap', () => {
  assert.match(eveningAccountability('arpan', ['GST reply'], false).body, /GST reply/);
  assert.match(eveningAccountability('priya', ['a'], false).body, /Arpan/);
  assert.equal(timeUseFlag({ billable: 60, building: 0, advising: 60, other: 0 }).flag, true);
  assert.equal(timeUseFlag({ billable: 10, building: 0, advising: 20, other: 0 }).flag, false); // too little data
});

test('planNotifications adds nudges only when asked, inside 06–23, none beside another notification', () => {
  const p: any = { wake: '06:30', sleep: '22:30', intensiveStart: '09:00', intensiveEnd: '20:00', quietStart: '23:00', quietEnd: '06:00' };
  const now = ist('2026-10-25T05:00:00');
  const none = planNotifications(p, { enabled: true }, now);
  assert.equal(none.filter((x) => x.data.kind === 'nudge').length, 0);
  const withN = planNotifications(p, { enabled: true }, now, { nudges: { gapMin: 30, line: (h) => ({ title: 't', body: `h${h}`, route: '/' }) } });
  const ns = withN.filter((x) => x.data.kind === 'nudge');
  assert.ok(ns.length > 10);
  for (const n of ns) for (const o of withN) if (o !== n) assert.ok(Math.abs(o.at.getTime() - n.at.getTime()) >= 10 * 60000 || o.data.kind === 'nudge');
});
