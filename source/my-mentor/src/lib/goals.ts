// Goals tree: year -> quarter -> month -> week. Progress rolls up from children; leaves use their own numbers.
// Pure module. Pace compares real progress with the share of the time window already used.
import { liveRows, type Collections, type Row } from './collections';

export type Horizon = 'year' | 'quarter' | 'month' | 'week';
export const HORIZONS: Horizon[] = ['year', 'quarter', 'month', 'week'];
export const AREAS = [
  { key: 'practice', label: 'Practice & work', emoji: '💼' },
  { key: 'health', label: 'Health', emoji: '🏃' },
  { key: 'family', label: 'Family & couple', emoji: '👨‍👩‍👧' },
  { key: 'learning', label: 'Learning & skills', emoji: '📚' },
  { key: 'finance', label: 'Money', emoji: '💰' },
  { key: 'personal', label: 'Personal', emoji: '🌿' },
] as const;

export type Goal = Row & {
  title: string;
  area: string;
  horizon: Horizon;
  parentId?: string | null;
  target?: number | null; // numeric target (e.g. 12 clients)
  unit?: string;
  current?: number | null;
  start?: string; // YYYY-MM-DD
  due?: string; // YYYY-MM-DD
  status: 'active' | 'done' | 'paused';
  why?: string;
  habitIds?: string[]; // habits that feed this goal
};

export const goalsOf = (cols: Collections) => liveRows<Goal>(cols, 'goals', 'createdAt');

export const childrenOf = (all: Goal[], id: string) => all.filter((g) => g.parentId === id && g.status !== 'paused');

/** 0..1. Done = 1. Parents average their active children. Leaves with a target use current/target. Otherwise 0. */
export function progressOf(g: Goal, all: Goal[], depth = 0): number {
  if (g.status === 'done') return 1;
  const kids = depth < 6 ? childrenOf(all, g.id) : [];
  if (kids.length) return kids.reduce((a, k) => a + progressOf(k, all, depth + 1), 0) / kids.length;
  if (g.target && g.target > 0) return Math.max(0, Math.min(1, (g.current ?? 0) / g.target));
  return 0;
}

const dayMs = 86400000;
const t = (d: string) => new Date(`${d}T12:00:00+05:30`).getTime();

/** Share of the time window used so far (0..1), or null when there are no dates. */
export function elapsedShare(g: Pick<Goal, 'start' | 'due' | 'createdAt'>, today: string): number | null {
  if (!g.due) return null;
  const start = g.start ?? g.createdAt.slice(0, 10);
  const total = t(g.due) - t(start);
  if (total <= 0) return 1;
  return Math.max(0, Math.min(1, (t(today) - t(start)) / total));
}

export type Pace = 'done' | 'on_track' | 'behind' | 'overdue' | 'no_dates';
export function paceOf(g: Goal, all: Goal[], today: string): { pace: Pace; progress: number; expected: number | null } {
  const progress = progressOf(g, all);
  if (g.status === 'done' || progress >= 1) return { pace: 'done', progress, expected: null };
  const expected = elapsedShare(g, today);
  if (expected === null) return { pace: 'no_dates', progress, expected };
  if (g.due && g.due < today) return { pace: 'overdue', progress, expected };
  return { pace: progress + 0.15 < expected ? 'behind' : 'on_track', progress, expected };
}

export const daysLeft = (g: Pick<Goal, 'due'>, today: string) => (g.due ? Math.round((t(g.due) - t(today)) / dayMs) : null);

/** Default window for a horizon starting today. */
export function windowFor(h: Horizon, today: string): { start: string; due: string } {
  const add = { week: 7, month: 30, quarter: 91, year: 365 }[h];
  const due = new Date(t(today) + add * dayMs).toISOString().slice(0, 10);
  return { start: today, due };
}

/** Roots first, children nested under each, for a flat list render. */
export function flatten(all: Goal[]): { goal: Goal; depth: number }[] {
  const out: { goal: Goal; depth: number }[] = [];
  const ids = new Set(all.map((g) => g.id));
  const walk = (g: Goal, depth: number) => {
    out.push({ goal: g, depth });
    if (depth < 5) for (const k of all.filter((x) => x.parentId === g.id)) walk(k, depth + 1);
  };
  for (const g of all.filter((x) => !x.parentId || !ids.has(x.parentId))) walk(g, 0);
  return out;
}
