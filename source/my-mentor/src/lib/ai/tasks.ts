// One-shot AI tasks (score a practice answer, break down a goal, plan the business week).
// Same privacy path as chat: crisis check -> consent check -> mask -> call -> unmask. Each returns a result or a code
// so the screen can fall back to the rules-based version and say honestly why.
import { type Scenario, type Scores } from '../comm-lab';
import { insightsForAi } from '../push-coach';
import { dueList, growthOf, targetsOf, timeOf, timeSummary, weekGrowth } from '../business';
import { dateKey } from '../metrics';
import type { State } from '../store';
import { callMentor } from './client';
import { buildContext, contextCategories } from './context';
import { detectCrisis } from './crisis';
import type { AiCode } from './explain';
import { maskDeep, maskText, unmaskText, type MaskMap } from './mask';

export type TaskResult<T> = { ok: true; data: T; used?: number; cap?: number } | { ok: false; code: AiCode | 'crisis' };

export type CommScore = { scores: Scores; strengths: string[]; improve: string[]; rewrite: string };

export async function aiScoreAnswer(s: State, sc: Scenario, answer: string): Promise<TaskResult<CommScore>> {
  if (detectCrisis(answer)) return { ok: false, code: 'crisis' };
  if (!s.profile.aiConsentGeneral) return { ok: false, code: 'consent_required' };
  const names = s.prefs.maskNames;
  const r = maskText(`SCENARIO: ${sc.title}. ${sc.setup}\nGOAL OF THE ANSWER: ${sc.goal}\nTIME LIMIT: about ${sc.seconds} seconds spoken.\n\nANSWER:\n${answer}`, { names });
  const res = await callMentor<CommScore>({ mode: 'comm_score', messages: [{ role: 'user', text: r.text }], categories: ['plans'], lang: s.profile.language, style: 'communication' });
  if (!res.ok) return { ok: false, code: res.code };
  if (res.crisis) return { ok: false, code: 'crisis' };
  const d = res.data as CommScore | undefined;
  if (!d) return { ok: false, code: 'ai_bad_format' };
  return { ok: true, data: { ...d, strengths: d.strengths.map((x) => unmaskText(x, r.map)), improve: d.improve.map((x) => unmaskText(x, r.map)), rewrite: unmaskText(d.rewrite, r.map) }, used: res.used, cap: res.cap };
}

export type GoalPlan = { milestones: { title: string; weeks: number }[]; firstStep: string };

export async function aiGoalPlan(s: State, title: string, why: string, start: string, due: string): Promise<TaskResult<GoalPlan>> {
  if (detectCrisis(`${title} ${why}`)) return { ok: false, code: 'crisis' };
  if (!s.profile.aiConsentGeneral) return { ok: false, code: 'consent_required' };
  const r = maskText(`GOAL: ${title}\nWHY IT MATTERS: ${why || 'not stated'}\nWINDOW: ${start} to ${due}`, { names: s.prefs.maskNames });
  const res = await callMentor<GoalPlan>({ mode: 'goal_plan', messages: [{ role: 'user', text: r.text }], categories: ['plans'], lang: s.profile.language, style: s.profile.coachingStyle });
  if (!res.ok) return { ok: false, code: res.code };
  const d = res.data as GoalPlan | undefined;
  if (!d) return { ok: false, code: 'ai_bad_format' };
  return { ok: true, data: { milestones: d.milestones.map((m) => ({ ...m, title: unmaskText(m.title, r.map) })), firstStep: unmaskText(d.firstStep, r.map) }, used: res.used, cap: res.cap };
}

export type BizPlan = { focus: string; actions: { text: string; why: string }[] };

export async function aiBizPlan(s: State): Promise<TaskResult<BizPlan>> {
  if (!s.profile.aiConsentGeneral) return { ok: false, code: 'consent_required' };
  const cats = contextCategories(s.profile);
  if (!cats.includes('work')) return { ok: false, code: 'consent_required' };
  const today = dateKey();
  let map: MaskMap = {};
  const growth = weekGrowth(growthOf(s.collections), today);
  const ts = timeSummary(timeOf(s.collections), today, 14);
  const biz = {
    thisWeek: growth,
    targets: targetsOf(s.collections),
    timeLast14Days: { totalHours: Math.round(ts.total / 6) / 10, delegablePct: ts.total ? Math.round((ts.delegable / ts.total) * 100) : null, businessDevelopmentPct: ts.total ? Math.round((ts.bd / ts.total) * 100) : null },
    complianceDueNext7Days: dueList(today, s.collections, 7, 0).filter((o) => !o.done).map((o) => ({ name: o.tpl.name, due: o.due })),
  };
  const ctx = { ...buildContext(s, ['plans']), business: biz, insights: insightsForAi(s) };
  const m = maskDeep(ctx, { names: s.prefs.maskNames, map });
  map = m.map;
  const res = await callMentor<BizPlan>({ mode: 'biz_plan', messages: [{ role: 'user', text: 'Plan my business week from the recorded numbers.' }], context: m.value, categories: ['plans', 'work'], lang: s.profile.language, style: 'business' });
  if (!res.ok) return { ok: false, code: res.code };
  const d = res.data as BizPlan | undefined;
  if (!d) return { ok: false, code: 'ai_bad_format' };
  return { ok: true, data: { focus: unmaskText(d.focus, map), actions: d.actions.map((a) => ({ text: unmaskText(a.text, map), why: unmaskText(a.why, map) })) }, used: res.used, cap: res.cap };
}
