// Per-habit statistics. Same honesty rules as metrics.ts:
//  - rest days and N/A are excluded; unrecorded days are reported separately and are NOT counted as missed;
//  - only days the habit is scheduled for, and only days since the habit was created, are counted.
import { dateKey, lastNDates } from './metrics';
import type { Habit, HabitStatus, State } from './store';

export const weekdayOf = (date: string) => new Date(`${date}T12:00:00+05:30`).getUTCDay(); // 0 = Sunday
export const isScheduled = (h: Pick<Habit, 'days'>, date: string) => !h.days || h.days.length === 0 || h.days.includes(weekdayOf(date));
export const startDate = (h: Pick<Habit, 'createdAt'>) => dateKey(new Date(h.createdAt));

export const statusOn = (s: Pick<State, 'habitLogs'>, habitId: string, date: string): HabitStatus | undefined => s.habitLogs[date]?.[habitId];

export type HabitStats = {
  scheduled: number;
  done: number;
  partial: number;
  missed: number;
  unrecorded: number;
  excused: number; // rest + N/A
  eligible: number; // done + partial + missed
  pct: number | null; // done / eligible
};

export function habitStats(s: Pick<State, 'habitLogs'>, h: Habit, dates: string[], today = dateKey()): HabitStats {
  const r: HabitStats = { scheduled: 0, done: 0, partial: 0, missed: 0, unrecorded: 0, excused: 0, eligible: 0, pct: null };
  const born = startDate(h);
  for (const d of dates) {
    if (d < born || !isScheduled(h, d)) continue;
    r.scheduled++;
    const st = statusOn(s, h.id, d);
    if (st === 'rest' || st === 'na') r.excused++;
    else if (!st) {
      if (d !== today) r.unrecorded++; // today is not over yet
    } else {
      r.eligible++;
      if (st === 'done') r.done++;
      else if (st === 'partial') r.partial++;
      else r.missed++;
    }
  }
  r.pct = r.eligible ? Math.round((r.done / r.eligible) * 100) : null;
  return r;
}

/** Current streak of scheduled days done. Rest/N/A days neither add nor break it; today unrecorded does not break it. */
export function habitStreak(s: Pick<State, 'habitLogs'>, h: Habit, today = dateKey()): number {
  const born = startDate(h);
  const days = lastNDates(400, new Date(`${today}T12:00:00+05:30`));
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i];
    if (d < born) break;
    if (!isScheduled(h, d)) continue;
    const st = statusOn(s, h.id, d);
    if (st === 'rest' || st === 'na') continue;
    if (!st && d === today) continue;
    if (st === 'done') streak++;
    else break;
  }
  return streak;
}

export function bestStreak(s: Pick<State, 'habitLogs'>, h: Habit, today = dateKey()): number {
  const born = startDate(h);
  const days = lastNDates(400, new Date(`${today}T12:00:00+05:30`)).filter((d) => d >= born);
  let best = 0;
  let run = 0;
  for (const d of days) {
    if (!isScheduled(h, d)) continue;
    const st = statusOn(s, h.id, d);
    if (st === 'rest' || st === 'na') continue;
    if (st === 'done') best = Math.max(best, ++run);
    else if (!st && d === today) continue;
    else run = 0;
  }
  return best;
}

/** Done-rate per weekday (0 = Sunday), over the given dates. Used to find "you keep missing Tuesdays". */
export function weekdayPattern(s: Pick<State, 'habitLogs'>, h: Habit, dates: string[], today = dateKey()) {
  const out = Array.from({ length: 7 }, () => ({ done: 0, eligible: 0, pct: null as number | null }));
  const born = startDate(h);
  for (const d of dates) {
    if (d < born || !isScheduled(h, d)) continue;
    const st = statusOn(s, h.id, d);
    if (!st || st === 'rest' || st === 'na') continue; // unrecorded is unknown, not a miss
    const w = out[weekdayOf(d)];
    w.eligible++;
    if (st === 'done') w.done++;
  }
  for (const w of out) w.pct = w.eligible ? Math.round((w.done / w.eligible) * 100) : null;
  return out;
}

/** How many habits were done on each date (for the heatmap). */
export function heatmap(s: Pick<State, 'habitLogs'>, habits: Habit[], dates: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of dates) out[d] = habits.filter((h) => statusOn(s, h.id, d) === 'done').length;
  return out;
}

/** Last N days of statuses, oldest first (null = no record). */
export function lastStatuses(s: Pick<State, 'habitLogs'>, h: Habit, n: number, today = dateKey()): (HabitStatus | null)[] {
  return lastNDates(n, new Date(`${today}T12:00:00+05:30`)).map((d) => (isScheduled(h, d) ? (statusOn(s, h.id, d) ?? null) : null));
}

/** Habits slipping right now: scheduled, recent eligible days mostly missed. Drives the "push harder" coach. */
export function slippingHabits<H extends Habit>(s: Pick<State, 'habitLogs'>, habits: H[], today = dateKey()) {
  const dates = lastNDates(14, new Date(`${today}T12:00:00+05:30`));
  return habits
    .map((h) => ({ h, st: habitStats(s, h, dates, today), streak: habitStreak(s, h, today) }))
    .filter((x) => x.st.eligible >= 3 && x.st.pct !== null && x.st.pct < 50)
    .sort((a, b) => (a.st.pct ?? 0) - (b.st.pct ?? 0));
}
