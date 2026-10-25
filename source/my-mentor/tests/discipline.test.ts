import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_CONFIG, configOf, configRow, detoxStreak, disciplineScore, eveningRow, glassesFromText, lateByMin, shouldRecordWake, waterOn, waterRow, waterStreak, waterTotals, wakeRow,
} from '../src/lib/discipline.ts';
import { eveningAccountability, lateWakeLine, nudgeGap, nudgeTimes, pickNudge, slotOf, timeUseFlag } from '../src/lib/nudges.ts';
import { LESSONS, dayOfYear, lessonFor } from '../src/lib/wisdom.ts';
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
  assert.match(lateWakeLine('08:40', 160, 'en')!, /tomorrow will be harder/);
  assert.match(lateWakeLine('08:40', 160, 'hi')!, /कल मुश्किल/);
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

test('nudges: window, Priya rules in every language, adaptive gap', () => {
  assert.equal(slotOf(5), null);
  assert.equal(slotOf(23), null);
  const base = { openToday: 2, waterGlasses: 0, waterTarget: 8 };
  for (const weekday of [1, 0])
    for (let h = 6; h < 23; h++)
      for (const m of [0, 15, 30, 45]) {
        const ctx = { ...base, hour: h, minute: m, weekday };
        const en = pickNudge({ ...ctx, role: 'priya', lang: 'en' });
        const hi = pickNudge({ ...ctx, role: 'priya', lang: 'hi' });
        const both = pickNudge({ ...ctx, role: 'priya', lang: 'both' });
        if (!en) continue; // a Sunday late evening may have no line
        assert.match(en.body, /Arpan/, `Priya ${h}:${m} names Arpan`);
        assert.match(en.body, /Discussed with Arpan\? Delegating today, or working alone\?/);
        assert.match(hi!.body, /अर्पण/);
        assert.match(hi!.body, /बात हुई/);
        assert.match(hi!.body, /करवा रही हो या अकेले कर रही हो/);
        assert.doesNotMatch(en.body + en.title, /\bkg\b|fat|weight|diabetes|obese/i, 'no body/weight talk');
        assert.ok(both!.body.startsWith(hi!.body) && both!.body.endsWith(en.body), 'both = Hindi then English');
        const a = pickNudge({ ...ctx, role: 'arpan', lang: 'en' });
        if (a) assert.ok(a.body.length <= 130 && a.title.length <= 30, `Arpan ${h}:${m} short`);
      }
  assert.equal(pickNudge({ ...base, role: 'arpan', hour: 3, minute: 0 }), null);
  assert.equal(nudgeGap({ nudgeEvery: 15 }, 0, false), 15);
  assert.equal(nudgeGap({ nudgeEvery: 15 }, 3, false), 30);
  assert.equal(nudgeGap({ nudgeEvery: 15 }, 3, true), 120);
  const t = nudgeTimes(60);
  assert.equal(t[0], 360);
  assert.ok(t.every((m) => m >= 360 && m < 1380));
});

test('Sunday is not a rest day: each other, billing, content (AI + schedule), gyaan', () => {
  const base = { openToday: 0, waterGlasses: 8, waterTarget: 8, weekday: 0, minute: 0, lang: 'en' as const };
  const at = (h: number, role: 'arpan' | 'priya') => pickNudge({ ...base, hour: h, role })!.body;
  assert.match(at(9, 'arpan'), /No rest/);
  assert.match(at(9, 'arpan'), /talk/);
  assert.match(at(13, 'arpan'), /billing/i);
  assert.match(at(16, 'arpan'), /AI/);
  assert.match(at(16, 'arpan'), /schedule/);
  assert.match(at(19, 'arpan'), /podcast/);
  assert.match(at(19, 'priya'), /Arpan/);
  assert.equal(pickNudge({ ...base, hour: 3, role: 'arpan' }), null);
});

test('Krishna lessons: rotate daily, bilingual, one action each', () => {
  assert.ok(LESSONS.length >= 12);
  for (const l of LESSONS) {
    assert.ok(l.idea.en && l.idea.hi && l.action.en && l.action.hi && l.source);
    if (/Chanakya/.test(l.source)) assert.match(l.source, /attributed/, 'Chanakya items are labelled as traditionally attributed');
  }
  assert.notEqual(lessonFor(10).id, lessonFor(11).id);
  assert.equal(lessonFor(-1).id, LESSONS[LESSONS.length - 1].id);
  assert.equal(dayOfYear('2026-01-01'), 1);
});

test('evening accountability + time-use cap', () => {
  assert.match(eveningAccountability('arpan', ['GST reply'], false, 'en').body, /GST reply/);
  assert.match(eveningAccountability('priya', ['a'], false, 'en').body, /Arpan/);
  assert.match(eveningAccountability('priya', ['a'], false, 'hi').body, /अर्पण/);
  assert.equal(timeUseFlag({ billable: 60, building: 0, advising: 60, other: 0 }).flag, true);
  assert.equal(timeUseFlag({ billable: 10, building: 0, advising: 20, other: 0 }).flag, false); // too little data
});

test('planNotifications adds nudges only when asked, inside 06–23, none beside another notification', () => {
  const p: any = { wake: '06:30', sleep: '22:30', intensiveStart: '09:00', intensiveEnd: '20:00', quietStart: '23:00', quietEnd: '06:00' };
  const now = ist('2026-10-25T05:00:00');
  const none = planNotifications(p, { enabled: true }, now);
  assert.equal(none.filter((x) => x.data.kind === 'nudge').length, 0);
  const withN = planNotifications(p, { enabled: true }, now, { nudges: { gapMin: 30, line: (h: number) => ({ title: 't', body: `h${h}`, route: '/' }) } });
  const ns = withN.filter((x) => x.data.kind === 'nudge');
  assert.ok(ns.length > 10);
  for (const n of ns) for (const o of withN) if (o !== n) assert.ok(Math.abs(o.at.getTime() - n.at.getTime()) >= 10 * 60000 || o.data.kind === 'nudge');
});

import { bucketsFor, minutesLeftToday } from '../src/lib/todo.ts';
test('Now / Next / Later with overdue', () => {
  const T = '2026-10-25';
  const items: any[] = [
    { id: 'old', title: 'old', date: '2026-10-24' },
    { id: 'passed', title: 'passed', date: T, time: '09:00', durationMin: 30 },
    { id: 'live', title: 'live', date: T, time: '10:00', durationMin: 60 },
    { id: 'n1', title: 'n1', date: T, time: '12:00' },
    { id: 'n2', title: 'n2', date: T, time: '13:00' },
    { id: 'n3', title: 'n3', date: T, time: '14:00' },
    { id: 'n4', title: 'n4', date: T, time: '15:00' },
    { id: 'u-low', title: 'low', date: T, priority: 'low' },
    { id: 'u-high', title: 'high', date: T, priority: 'high' },
    { id: 'done', title: 'done', date: T, time: '10:30', done: true },
  ];
  const b = bucketsFor(items, T, 10 * 60 + 15);
  assert.deepEqual(b.overdue.map((i) => i.id), ['old', 'passed']);
  assert.deepEqual(b.now.map((i) => i.id), ['live']);
  assert.deepEqual(b.next.map((i) => i.id), ['n1', 'n2', 'n3']);
  assert.deepEqual(b.later.map((i) => i.id), ['u-high', 'u-low', 'n4']);
  // nothing timed is live: the top-priority untimed item is "Now"
  const c = bucketsFor(items.filter((i) => i.id !== 'live'), T, 10 * 60 + 15);
  assert.deepEqual(c.now.map((i) => i.id), ['u-high']);
  assert.equal(minutesLeftToday(b), 8 * 30 + 60);
});

import { fixedNotifications } from '../src/lib/nudges.ts';
import { spentVsBuilt } from '../src/lib/business.ts';
import { nextDeliverable, nextStatus, pipeRow, weekKey } from '../src/lib/pipeline.ts';

test('fixed nightly prompts: timesheet (Arpan, Mon–Sat), check-in, detox before cut-off', () => {
  const a = fixedNotifications({ role: 'arpan', eveningCheckin: '21:30', detoxCutoff: '22:30' }, 'en');
  assert.deepEqual(a.map((f) => `${f.kind}@${f.time}`), ['timesheet@21:00', 'evening@21:30', 'detox@22:20']);
  assert.deepEqual(a[0].days, [1, 2, 3, 4, 5, 6]);
  const p = fixedNotifications({ role: 'priya', eveningCheckin: '21:30', detoxCutoff: '22:30' }, 'en');
  assert.deepEqual(p.map((f) => f.kind), ['evening', 'detox']);
  assert.match(p[0].body, /Arpan/);
  const prof: any = { wake: '06:30', sleep: '22:30', intensiveStart: '09:00', intensiveEnd: '20:00', quietStart: '23:00', quietEnd: '06:00' };
  const plan = planNotifications(prof, { enabled: true, weeklyReview: false }, ist('2026-10-25T05:00:00'), { fixed: a });
  const ts = plan.filter((x) => x.data.kind === 'timesheet').map((x) => x.data.day);
  assert.ok(!ts.includes('2026-10-25'), 'no timesheet prompt on Sunday'); // 25 Oct 2026 is a Sunday
  assert.ok(ts.includes('2026-10-26'));
});

test('spent vs built and advising cap', () => {
  const e = (category: string, minutes: number): any => ({ id: category, category, minutes, venture: 'Arpan Bohra & Co.', date: '2026-10-24', createdAt: '', updatedAt: '' });
  const r = spentVsBuilt([e('client', 120), e('bd', 60), e('advising', 90), e('admin', 30)], '2026-10-25');
  assert.deepEqual([r.billable, r.building, r.drain, r.total], [120, 60, 120, 300]);
  assert.equal(r.advisingPct, 30);
  assert.equal(r.advisingOverCap, true);
  assert.equal(spentVsBuilt([e('client', 30)], '2026-10-25').advisingOverCap, false);
});

test('pipeline: week key, status advance, daily deliverable', () => {
  assert.equal(weekKey('2026-10-25'), '2026-10-19'); // Sunday belongs to the week starting Monday 19 Oct
  assert.equal(weekKey('2026-10-26'), '2026-10-26');
  assert.equal(nextStatus('idea'), 'drafted');
  assert.equal(nextStatus('posted'), 'posted');
  assert.match(nextDeliverable([]).en, /Add 3 ideas/);
  const it = (status: any, text: string): any => ({ ...pipeRow('w', 1, 'content', text), status });
  assert.match(nextDeliverable([it('idea', 'GST notice tips')]).en, /first draft/);
  assert.match(nextDeliverable([it('drafted', 'GST notice tips')]).en, /Schedule/);
  assert.match(nextDeliverable([it('scheduled', 'GST notice tips')]).en, /Publish/);
  assert.match(nextDeliverable([it('posted', 'x')]).en, /next week/);
});

import { fromEvent, planSync, runSync, toEvent } from '../src/lib/calendar.ts';
test('calendar: mapping and two-way plan', () => {
  const ev = toEvent({ id: 'a', title: 'GST reply', date: '2026-10-26', time: '10:00', durationMin: 45, updatedAt: '2026-10-25T00:00:00Z' });
  assert.equal(ev.start.dateTime, '2026-10-26T10:00:00+05:30');
  assert.equal(ev.end.dateTime, '2026-10-26T05:15:00.000Z'); // 10:45 IST
  const allDay: any = toEvent({ id: 'b', title: 'Billing', date: '2026-10-26', updatedAt: '' });
  assert.deepEqual([allDay.start.date, allDay.end.date], ['2026-10-26', '2026-10-27']);
  assert.deepEqual(fromEvent({ id: 'g', summary: 'Call', updated: '', start: { dateTime: '2026-10-26T04:30:00Z' }, end: { dateTime: '2026-10-26T05:30:00Z' } }), { title: 'Call', date: '2026-10-26', time: '10:00', durationMin: 60, gcalId: 'g' });

  const w = { from: '2026-10-25', to: '2026-11-08' };
  const L = (o: any) => ({ title: 't', date: '2026-10-26', updatedAt: '2026-10-25T10:00:00Z', ...o });
  const R = (o: any) => ({ summary: 'r', updated: '2026-10-25T10:00:00Z', start: { date: '2026-10-26' }, ...o });
  // new local -> insert; new remote -> local upsert; own event with unsaved gcalId is not duplicated
  let p = planSync([L({ id: 'n' }), L({ id: 'own', title: 'x' })], [R({ id: 'g1' }), R({ id: 'g2', extendedProperties: { private: { mymentorId: 'own' } } })], w);
  assert.deepEqual(p.insertRemote.map((x) => x.id), ['n', 'own']);
  assert.deepEqual(p.upsertLocal.map((x) => x.id), ['gcal:g1']);
  // newer side wins
  p = planSync([L({ id: 'a', gcalId: 'g', updatedAt: '2026-10-25T12:00:00Z' })], [R({ id: 'g', updated: '2026-10-25T10:00:00Z' })], w);
  assert.equal(p.patchRemote.length, 1);
  p = planSync([L({ id: 'a', gcalId: 'g', updatedAt: '2026-10-25T10:00:00Z' })], [R({ id: 'g', updated: '2026-10-25T12:00:00Z' })], w);
  assert.equal(p.upsertLocal.length, 1);
  // after a sync, writing syncedAt alone is not an edit (no ping-pong)
  p = planSync([L({ id: 'a', gcalId: 'g', updatedAt: '2026-10-25T12:00:01Z', syncedAt: '2026-10-25T12:00:00Z' })], [R({ id: 'g', updated: '2026-10-25T11:59:59Z' })], w);
  assert.deepEqual([p.patchRemote.length, p.upsertLocal.length], [0, 0]);
  // cancellations and local deletes
  p = planSync([L({ id: 'a', gcalId: 'g' }), L({ id: 'd', gcalId: 'h', deletedAt: 'x' })], [R({ id: 'g', status: 'cancelled' }), R({ id: 'h' })], w);
  assert.deepEqual([p.deleteLocal, p.deleteRemote], [['a'], ['h']]);
});

test('calendar: runner calls Google with bearer token and maps 401', async () => {
  const calls: string[] = [];
  const f: any = async (url: string, init: any = {}) => {
    calls.push(`${init.method ?? 'GET'} ${url.includes('?') ? 'list' : 'event'} ${init.headers?.Authorization}`);
    return { ok: true, status: 200, json: async () => (init.method === 'POST' ? { id: 'new1' } : { items: [] }) };
  };
  const r = await runSync([{ id: 'n', title: 't', date: '2026-10-26', updatedAt: '' }], 'TOK', { from: '2026-10-25', to: '2026-11-08' }, f);
  assert.deepEqual(r.created, [{ id: 'n', gcalId: 'new1' }]);
  assert.deepEqual(calls, ['GET list Bearer TOK', 'POST event Bearer TOK']);
  await assert.rejects(runSync([], 'x', { from: 'a', to: 'b' }, (async () => ({ ok: false, status: 401, json: async () => ({}) })) as any), /calendar_auth/);
});

import { billRow, billedOn, billingPace, inr } from '../src/lib/billing.ts';
import { dueContacts, peopleOf, personRow } from '../src/lib/network.ts';
import { PUSHES, isSummary, summaryId, summaryLine } from '../src/lib/summary.ts';

test('billing: tentative entry, month pace against the target', () => {
  let c: any = {};
  c = put(c, billRow('2026-10-10', 100000));
  c = put(c, billRow('2026-10-20', 250000));
  c = put(c, billRow('2026-09-30', 999999)); // other month ignored
  assert.equal(billedOn(c, '2026-10-20'), 250000);
  assert.equal(billedOn(c, '2026-10-21'), null);
  const p = billingPace(c, 1000000, '2026-10-25');
  assert.deepEqual([p.total, p.pct, p.remaining, p.daysLeft], [350000, 35, 650000, 7]); // 25..31 Oct, today not entered
  assert.equal(p.needPerDay, Math.ceil(650000 / 7));
  assert.equal(billingPace(put(c, billRow('2026-10-25', 50000)), 1000000, '2026-10-25').daysLeft, 6);
  assert.equal(billRow('d', -5).amount, 0);
  assert.deepEqual([inr(950), inr(25000), inr(1000000), inr(12500000)], ['₹950', '₹25k', '₹10L', '₹1.3 Cr']);
});

test('network: people list and due contacts', () => {
  let c: any = {};
  c = put(c, personRow('1', 'Ravi', 14));
  c = put(c, { ...personRow('2', 'Meera', 7), lastContact: '2026-10-10' });
  c = put(c, { ...personRow('3', 'Sam', 30), lastContact: '2026-10-20' });
  const people = peopleOf(c);
  assert.equal(people.length, 3);
  const due = dueContacts(people, '2026-10-25');
  assert.deepEqual(due.map((d) => d.person.name), ['Ravi', 'Meera']); // never contacted first, then most overdue; Sam is not due
  assert.equal(due[1].daysSince, 15);
});

test('couple summary + pushes: summary only, own ids, canned pushes in both languages', () => {
  const s: any = { type: 'daily_summary', date: '2026-10-25', score: 72, water: '5/8', oneThingDone: true, habits: '3/5', detoxFree: null, woke: '06:10' };
  assert.ok(isSummary(s));
  assert.ok(!isSummary({ type: 'push' }));
  assert.equal(summaryId('abcdef1234567890', '2026-10-25'), 'sum:abcdef12:2026-10-25');
  const l = summaryLine(s, 'Priya');
  assert.match(l.en, /score 72/);
  assert.match(l.hi, /स्कोर 72/);
  assert.doesNotMatch(l.en, /₹|bill/i, 'no business numbers in the shared summary');
  for (const role of ['arpan', 'priya'] as const) for (const m of PUSHES[role]) assert.ok(m.text.en && m.text.hi);
});

test('Priya health goals: gym first, asks when empty, client satisfaction line, no weight talk', () => {
  const base = { openToday: 0, waterGlasses: 8, waterTarget: 8, weekday: 2, minute: 0, lang: 'en' as const, role: 'priya' as const };
  const seen = new Set<string>();
  for (let h = 6; h < 23; h++) for (const m of [0, 15, 30, 45]) {
    const n = pickNudge({ ...base, hour: h, minute: m, healthGoals: ['walk', 'gym'] });
    if (n) seen.add(n.id);
  }
  assert.ok(seen.has('p-h-gym'), 'gym line appears');
  assert.ok(seen.has('p-client'), 'client satisfaction line appears');
  const none = new Set<string>();
  for (let h = 6; h < 23; h++) for (const m of [0, 15, 30, 45]) { const n = pickNudge({ ...base, hour: h, minute: m, healthGoals: [] }); if (n) none.add(n.id); }
  assert.ok(none.has('p-h-ask'), 'asks her to choose goals');
  const all = pickNudge({ ...base, hour: 7, minute: 0, healthGoals: ['gym'] })!;
  assert.match(all.body, /Arpan/);
});

test('Arpan lines: billing pace, due person, morning question', () => {
  const base = { openToday: 0, waterGlasses: 8, waterTarget: 8, weekday: 2, minute: 0, lang: 'en' as const, role: 'arpan' as const };
  const bills = pickNudge({ ...base, hour: 13, minute: 15, billing: { total: 350000, target: 1000000, needPerDay: 92857, todayEntered: false } });
  const bodies: string[] = [];
  for (let m = 0; m < 60; m += 15) for (let h = 12; h < 18; h++) bodies.push(pickNudge({ ...base, hour: h, minute: m, billing: { total: 350000, target: 1000000, needPerDay: 92857, todayEntered: false } })!.body);
  assert.ok(bodies.some((b) => /₹3\.5L of ₹10L.*₹92\.9k a day.*tentative/.test(b)), bills?.body);
  const ev: string[] = [];
  for (let m = 0; m < 60; m += 15) for (let h = 18; h < 22; h++) ev.push(pickNudge({ ...base, hour: h, minute: m, duePerson: { name: 'Ravi', days: 20 } })!.body);
  assert.ok(ev.some((b) => /Ravi: 20 days since you spoke.*strong career/.test(b)));
  const am: string[] = [];
  for (let m = 0; m < 60; m += 15) for (let h = 6; h < 12; h++) am.push(pickNudge({ ...base, hour: h, minute: m })!.body);
  assert.ok(am.some((b) => /Which client or GST task comes first/.test(b)));
});

test('server copy of the nudge engine is up to date (run: node scripts/sync-nudge-copy.mjs)', async () => {
  const { build } = await import('../scripts/sync-nudge-copy.mjs');
  const { readFileSync } = await import('node:fs');
  assert.equal(readFileSync(new URL('../supabase/functions/nudge/nudges.ts', import.meta.url), 'utf8'), build());
});

test('the mentor server keeps the discipline context (role drives Krishna’s voice) and describes Krishna as guru + Chanakya', async () => {
  const { filterContext, buildSystemPrompt } = await import('../supabase/functions/mentor/prompt.ts');
  assert.deepEqual(filterContext({ discipline: { role: 'priya' }, secret: 1 }, ['plans']), { discipline: { role: 'priya' } });
  assert.deepEqual(filterContext({ discipline: { role: 'priya' } }, []), {});
  const p = buildSystemPrompt({ style: 'strict', lang: 'hinglish', mode: 'chat' });
  assert.match(p, /Chanakya Niti of today's world/);
  assert.match(p, /traditionally attributed/);
  assert.match(p, /Never mention her weight/);
  assert.match(p, /Tele-MANAS 14416/, 'crisis resources stay in the prompt');
});
