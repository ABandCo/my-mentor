import assert from 'node:assert/strict';
import { test } from 'node:test';

import { delegationAdvice, dueList, growthOf, TEMPLATES, timeSummary, weeklyActions, weekGrowth } from '../src/lib/business.ts';
import { CRITERIA, dailyDrill, offlineScore, percentOf, SCENARIOS, trend, weeklyExercise, type Attempt } from '../src/lib/comm-lab.ts';
import { DAILY_NOTES, GUIDES, loveResult, LOVE_QUIZ, noteFor, QUOTES, REPAIR } from '../src/lib/couple-content.ts';
import { agreements, type CoupleItem } from '../src/lib/couple-logic.ts';
import { paceOf, progressOf, flatten, windowFor, type Goal } from '../src/lib/goals.ts';
import { proposals } from '../src/lib/habits.ts';
import { pushList } from '../src/lib/push-coach.ts';
import { buildReport, reportHtml } from '../src/lib/reports.ts';
import { BADGES, earnedKeys, weeklyWins } from '../src/lib/rewards.ts';
import type { State } from '../src/lib/store.tsx';

const TODAY = '2026-10-18'; // a Sunday
const NOW = new Date('2026-10-18T10:00:00+05:30');
const day = (n: number) => new Date(new Date(`${TODAY}T12:00:00+05:30`).getTime() - n * 86400000).toISOString().slice(0, 10);
const base = (over: Partial<State> = {}): State =>
  ({ hydrated: true, collections: {}, chats: [], prefs: { maskNames: [], transcriptDays: 30, haptics: true, sounds: false, speakReplies: false }, name: 'A', profile: { language: 'en', coachingStyle: 'strict', focusAreas: [], wake: '06:30', sleep: '22:30', intensiveStart: '09:00', intensiveEnd: '20:00', quietStart: '22:30', quietEnd: '06:30', aiConsentGeneral: false, aiConsentSensitive: false, baselines: {} }, oneThing: {}, hours: {}, habits: [], habitLogs: {}, commitments: [], mood: {}, xp: 0, outbox: [], notif: { enabled: true }, ...over }) as State;
const row = (id: string, extra: Record<string, unknown> = {}) => ({ id, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', ...extra });

// ---------- habits: proposals ----------
test('proposals: needs 5 answered days; struggling habit gets a minimum-version and lighter-schedule offer', () => {
  const h = { id: 'h1', name: 'Run', emoji: '🏃', createdAt: '2026-09-01T00:00:00.000Z' };
  const logs: State['habitLogs'] = {};
  for (let i = 1; i <= 4; i++) logs[day(i)] = { h1: 'missed' };
  assert.equal(proposals({ habits: [h], habitLogs: logs, collections: {} }, TODAY).length, 0); // only 4 answered days
  for (let i = 5; i <= 8; i++) logs[day(i)] = { h1: i === 5 ? 'done' : 'missed' };
  const p = proposals({ habits: [h], habitLogs: logs, collections: {} }, TODAY);
  assert.deepEqual(p.map((x) => x.kind).sort(), ['lighter', 'minimum']);
  assert.deepEqual(p.find((x) => x.kind === 'lighter')!.patch.days, [1, 2, 3, 4, 5]);
});

test('proposals: a declined proposal stays declined', () => {
  const h = { id: 'h1', name: 'Run', emoji: '🏃', createdAt: '2026-09-01T00:00:00.000Z' };
  const logs: State['habitLogs'] = {};
  for (let i = 1; i <= 8; i++) logs[day(i)] = { h1: 'missed' };
  const cols = { habit_meta: { h1: row('h1', { dismissed: ['h1:minimum', 'h1:lighter'] }) } };
  assert.equal(proposals({ habits: [h], habitLogs: logs, collections: cols }, TODAY).filter((x) => x.kind !== 'skip_day').length, 0);
});

test('habit settings never overwrite the habit identity or start date (regression: createdAt leaked from the settings row)', async () => {
  const { habitsWithMeta } = await import('../src/lib/habits.ts');
  const h = { id: 'h1', name: 'Run', emoji: '🏃', createdAt: '2026-01-01T00:00:00.000Z' };
  const cols = { habit_meta: { h1: row('h1', { color: '#123456', createdAt: '2026-10-18T00:00:00.000Z', name: 'HACK', emoji: 'X', minVersion: 'tiny' }) } };
  const [m] = habitsWithMeta({ habits: [h], collections: cols });
  assert.equal(m.createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal(m.name, 'Run');
  assert.equal(m.emoji, '🏃');
  assert.equal(m.color, '#123456');
  assert.equal(m.minVersion, 'tiny');
  assert.equal(habitsWithMeta({ habits: [h], collections: { habit_meta: { h1: row('h1', { archived: true }) } } }).length, 0);
});

// ---------- goals ----------
const g = (id: string, over: Partial<Goal> = {}): Goal => ({ ...row(id), title: id, area: 'practice', horizon: 'month', status: 'active', ...over }) as Goal;

test('goals: parents average children; leaves use target/current; done is 100%', () => {
  const all = [g('p'), g('a', { parentId: 'p', target: 10, current: 5 }), g('b', { parentId: 'p', status: 'done' })];
  assert.equal(progressOf(all[0], all), 0.75);
  assert.equal(progressOf(g('x', { target: 4, current: 9 }), []), 1);
  assert.equal(progressOf(g('y'), []), 0);
});

test('goals: pace is behind only when progress trails time used by more than 15 points', () => {
  const goal = g('t', { start: '2026-10-01', due: '2026-10-31', target: 10, current: 2 });
  assert.equal(paceOf(goal, [goal], '2026-10-16').pace, 'behind'); // 50% of time, 20% done
  const ok = { ...goal, current: 4 };
  assert.equal(paceOf(ok, [ok], '2026-10-16').pace, 'on_track');
  assert.equal(paceOf(goal, [goal], '2026-11-05').pace, 'overdue');
  assert.equal(paceOf(g('n'), [], TODAY).pace, 'no_dates');
});

test('goals: flatten nests children and tolerates orphans', () => {
  const out = flatten([g('p'), g('c', { parentId: 'p' }), g('o', { parentId: 'missing' })]);
  assert.deepEqual(out.map((x) => `${x.goal.id}:${x.depth}`), ['p:0', 'c:1', 'o:0']);
  assert.equal(windowFor('week', TODAY).due, '2026-10-25');
});

// ---------- push coach ----------
test('push coach: slipping habit and overdue commitment are reported with their numbers; wins only when real', () => {
  const h = { id: 'h1', name: 'Walk', emoji: '🚶', createdAt: '2026-09-01T00:00:00.000Z' };
  const logs: State['habitLogs'] = {};
  for (let i = 1; i <= 6; i++) logs[day(i)] = { h1: 'missed' };
  const s = base({ habits: [h], habitLogs: logs, commitments: [{ id: 'c', text: 'File reply', due: day(2), done: false, createdAt: day(5) }] });
  const p = pushList(s, NOW);
  const slip = p.find((x) => x.id === 'slip:h1')!;
  assert.match(slip.title, /0 of 6 answered days/);
  assert.equal(slip.severity, 'high');
  assert.ok(p.some((x) => x.id === 'overdue'));
  assert.ok(!p.some((x) => x.severity === 'win'));
});

test('push coach: unrecorded days are never called misses', () => {
  const h = { id: 'h1', name: 'Walk', emoji: '🚶', createdAt: '2026-09-01T00:00:00.000Z' };
  const p = pushList(base({ habits: [h], habitLogs: {} }), NOW);
  assert.ok(!p.some((x) => x.id.startsWith('slip:')));
});

// ---------- communication lab ----------
test('comm lab: 24 scenarios, 6 per area, unique ids', () => {
  assert.equal(SCENARIOS.length, 24);
  assert.equal(new Set(SCENARIOS.map((s) => s.id)).size, 24);
  for (const a of ['client', 'seminar', 'english', 'assertive']) assert.equal(SCENARIOS.filter((s) => s.area === a).length, 6);
});

test('comm lab: offline scoring rewards structure and punishes fillers; empty answers score low; percent maths', () => {
  const sc = SCENARIOS[0];
  const good = offlineScore('I understand the concern, and I appreciate you raising it. First, our fee reflects the filings, the reviews and the notices we handle. For example, last year we resolved two notices without penalty. So the next step is that I send you a scope summary by Friday. Would you like that?', sc);
  const bad = offlineScore('um basically like I think maybe um you know it is, like, actually fine I guess', sc);
  assert.ok(percentOf(good.scores) > percentOf(bad.scores));
  assert.ok(bad.fillers >= 5);
  assert.ok(Object.values(offlineScore('hi', sc).scores).every((v) => v <= 1));
  assert.equal(percentOf({ clarity: 5, structure: 5, tone: 5, confidence: 5, relevance: 5 }), 100);
  assert.equal(CRITERIA.length, 5);
});

test('comm lab: trend needs 6 attempts for a change; daily drill gives 3 different areas and favours untried', () => {
  const at = (i: number, pct: number): Attempt => ({ ...row(String(i), { createdAt: `2026-10-${String(i).padStart(2, '0')}T00:00:00.000Z` }), scenarioId: 'c1', area: 'client', transcript: '', scores: { clarity: 3, structure: 3, tone: 3, confidence: 3, relevance: 3 }, percent: pct, source: 'rules' }) as Attempt;
  assert.equal(trend([at(1, 40), at(2, 50)]).change, null);
  assert.equal(trend([40, 42, 44, 60, 62, 64].map((p, i) => at(i + 1, p))).change, 20);
  const drill = dailyDrill([], TODAY);
  assert.equal(drill.length, 3);
  assert.equal(new Set(drill.map((d) => d.area)).size, 3);
  assert.ok(!dailyDrill([at(1, 50)], TODAY).some((d) => d.id === 'c1') || SCENARIOS.length > 0);
  assert.ok(weeklyExercise(TODAY).text.length > 10);
});

// ---------- business ----------
test('business: compliance occurrences, verification-friendly, user can switch templates off and tick done', () => {
  const list = dueList('2026-10-05', {}, 20, 0);
  const names = list.map((o) => `${o.tpl.id}@${o.due}`);
  assert.ok(names.includes('tds-pay@2026-10-07'));
  assert.ok(names.includes('gstr1@2026-10-11'));
  assert.ok(names.includes('gstr3b@2026-10-20'));
  assert.ok(names.includes('pf@2026-10-15'));
  assert.ok(names.includes('itr-audit@2026-10-31') === false); // 26 days out, beyond the 20-day horizon
  const off = dueList('2026-10-05', { compliance_items: { 'off:gstr1': row('off:gstr1', { off: true }) } }, 20, 0).map((o) => o.tpl.id);
  assert.ok(!off.includes('gstr1'));
  const done = dueList('2026-10-05', { compliance_items: { 'gstr1:2026-10-11': row('gstr1:2026-10-11', { done: true }) } }, 20, 0).find((o) => o.tpl.id === 'gstr1')!;
  assert.equal(done.done, true);
  assert.ok(TEMPLATES.every((t) => t.note.length > 5));
});

test('business: delegation advice needs 3 logged days, then reports from the user own minutes', () => {
  const t = (i: number, category: string, minutes: number) => ({ ...row(`t${i}`), category, minutes, venture: 'Arpan Bohra & Co.', date: day(i) }) as never;
  assert.match(delegationAdvice(timeSummary([t(1, 'admin', 60)], TODAY))[0], /at least 3 days/);
  const sum = timeSummary([t(1, 'admin', 120), t(2, 'filing', 60), t(3, 'client', 180), t(4, 'client', 180)], TODAY);
  const adv = delegationAdvice(sum).join(' ');
  assert.match(adv, /33%/); // admin 120 + filing 60 = 180 of 540 logged minutes
  assert.match(adv, /Business development is 0%/);
});

test('business: weekly actions reflect shortfall against targets', () => {
  const cols = { biz_log: { a: row('a', { kind: 'content', text: 'post', venture: 'x', date: TODAY }) } };
  const wg = weekGrowth(growthOf(cols), TODAY);
  assert.equal(wg.content, 1);
  const acts = weeklyActions(TODAY, cols).join(' | ');
  assert.match(acts, /Publish 1 more/);
  assert.match(acts, /referral/);
});

// ---------- couple content & sharing ----------
test('couple content: every note, quote, repair script exists in all three languages; deterministic by date', () => {
  for (const n of DAILY_NOTES) assert.ok(n.note.en && n.note.hi && n.note.hl);
  for (const q of QUOTES) assert.ok(q.q.en && q.q.hi && q.q.hl);
  for (const r of REPAIR) assert.ok(r.say.en && r.say.hi && r.say.hl && r.when.en);
  assert.equal(noteFor(TODAY), noteFor(TODAY));
  assert.ok(GUIDES.length >= 8);
  assert.notEqual(noteFor('2026-10-18').note.en, noteFor('2026-10-19').note.en);
});

test('couple: love-language quiz tallies; a goal is shared only when the OTHER person agrees', () => {
  const answers = LOVE_QUIZ.map((q) => q.options[1].key); // always "time"
  assert.equal(loveResult(answers)[0].key, 'time');
  const it = (id: string, author: string, kind: CoupleItem['kind'], data: Record<string, unknown> = {}): CoupleItem => ({ id, author, kind, data, createdAt: '', updatedAt: '' });
  const items = [it('g1', 'A', 'goal', { title: 'Trip' }), it('x', 'A', 'goal_agree', { ref: 'g1' })];
  assert.equal(agreements(items, 'goal')[0].active, false); // author cannot agree to their own goal
  assert.equal(agreements([...items, it('y', 'B', 'goal_agree', { ref: 'g1' })], 'goal')[0].active, true);
});

// ---------- rewards & reports ----------
test('rewards: badges are earned from records only and never from an empty state', () => {
  assert.deepEqual(earnedKeys(base(), TODAY), []);
  const h = { id: 'h1', name: 'Walk', emoji: '🚶', createdAt: '2026-08-01T00:00:00.000Z' };
  const logs: State['habitLogs'] = {};
  for (let i = 0; i < 15; i++) logs[day(i)] = { h1: 'done' };
  const keys = earnedKeys(base({ habits: [h], habitLogs: logs }), TODAY);
  assert.ok(keys.includes('first-log') && keys.includes('streak-7') && keys.includes('habit-14'));
  assert.ok(!keys.includes('streak-30'));
  assert.equal(new Set(BADGES.map((b) => b.key)).size, BADGES.length);
});

test('reports: numbers match the records, unrecorded days are not misses, html carries the method', () => {
  const h = { id: 'h1', name: 'Walk', emoji: '🚶', createdAt: '2026-09-01T00:00:00.000Z' };
  const logs: State['habitLogs'] = { [day(1)]: { h1: 'done' }, [day(2)]: { h1: 'done' }, [day(3)]: { h1: 'missed' } };
  const s = base({ habits: [h], habitLogs: logs });
  const r = buildReport(s, 'weekly', NOW);
  assert.equal(r.habits[0].done, 2);
  assert.equal(r.habits[0].eligible, 3);
  assert.equal(r.habits[0].pct, 67);
  assert.ok(r.habits[0].unrecorded >= 3); // the other days are unknown, not failures
  assert.equal(r.headline[0].value, '67%');
  const html = reportHtml(r, 'Test');
  assert.match(html, /How this is calculated/);
  assert.match(html, /never counted as missed/);
  assert.equal(weeklyWins(s, TODAY).habitDone, 2);
});
