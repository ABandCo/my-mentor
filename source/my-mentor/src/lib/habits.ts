// Habit settings (colour, schedule, target, minimum version, purpose) and the adaptive proposals.
// Pure module. Settings live in the `habit_meta` collection (one row per habit, id = habit id) so they sync;
// proposals are rules over the honest per-habit stats and are NEVER applied without the user tapping Approve.
import { liveRows, type Collections } from './collections';
import { habitStats, isScheduled, weekdayPattern } from './habit-stats';
import { dateKey, lastNDates } from './metrics';
import type { Habit, State } from './store';

export const HABIT_COLORS = ['#4F7A63', '#D9A441', '#6FA8C7', '#C8553D', '#8E7CC3', '#E07BA0', '#5FA8A0', '#B08968'] as const;

export type HabitMeta = {
  color?: string;
  days?: number[];
  targetValue?: number;
  unit?: string;
  minVersion?: string;
  purpose?: string;
  timerMin?: number;
  reminder?: string; // HH:MM
  dismissed?: string[]; // proposal ids the user declined
  archived?: boolean;
};

/** Only the known settings fields: the stored row also carries id/createdAt/updatedAt, which must never leak onto a habit. */
export const metaOf = (cols: Collections, habitId: string): HabitMeta => {
  const r = cols.habit_meta?.[habitId] as (Record<string, unknown> & HabitMeta) | undefined;
  if (!r || r.deletedAt) return {};
  const { color, days, targetValue, unit, minVersion, purpose, timerMin, reminder, dismissed, archived } = r;
  return { color, days, targetValue, unit, minVersion, purpose, timerMin, reminder, dismissed, archived };
};

/** Habits with their saved settings merged in (this is what every stats function should receive). */
export function habitsWithMeta(s: Pick<State, 'habits' | 'collections'>): (Habit & HabitMeta)[] {
  return s.habits
    .map((h) => {
      const m = metaOf(s.collections, h.id);
      const defined = Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined)) as HabitMeta;
      return { ...h, ...defined, days: m.days ?? h.days };
    })
    .filter((h) => !h.archived);
}

export const colorOf = (h: { id: string; color?: string }, index = 0) => h.color ?? HABIT_COLORS[index % HABIT_COLORS.length];

export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export type Proposal = {
  id: string; // stable per habit + kind so a declined proposal stays declined
  habitId: string;
  kind: 'minimum' | 'lighter' | 'skip_day' | 'level_up';
  title: string;
  detail: string;
  patch: Partial<HabitMeta>;
};

/**
 * Suggestions based on the last 14 days. Needs at least 5 answered days so a few missed days never trigger a change.
 * - Struggling (<40% done): offer a tiny "minimum version", or fewer days.
 * - One weekday that always fails: offer to take that weekday off the schedule.
 * - Rock solid (>=90% over 10+ days): offer a step up.
 */
export function proposals(s: Pick<State, 'habits' | 'habitLogs' | 'collections'>, today = dateKey()): Proposal[] {
  const dates = lastNDates(14, new Date(`${today}T12:00:00+05:30`));
  const out: Proposal[] = [];
  for (const h of habitsWithMeta(s)) {
    const st = habitStats(s, h, dates, today);
    const declined = new Set(h.dismissed ?? []);
    const push = (p: Proposal) => !declined.has(p.id) && out.push(p);
    if (st.eligible >= 5 && st.pct !== null && st.pct < 40) {
      if (!h.minVersion)
        push({
          id: `${h.id}:minimum`,
          habitId: h.id,
          kind: 'minimum',
          title: `Make "${h.name}" smaller`,
          detail: `Done ${st.done} of ${st.eligible} answered days. A tiny version you can do on your worst day keeps the chain alive. Add one?`,
          patch: { minVersion: 'Just 2 minutes of it' },
        });
      const scheduledDays = h.days && h.days.length ? h.days.length : 7;
      if (scheduledDays > 4)
        push({
          id: `${h.id}:lighter`,
          habitId: h.id,
          kind: 'lighter',
          title: `Fewer days for "${h.name}"`,
          detail: `Try Monday to Friday only for two weeks, then build back up. Four real days beat seven imagined ones.`,
          patch: { days: [1, 2, 3, 4, 5] },
        });
    }
    const pat = weekdayPattern(s, h, lastNDates(42, new Date(`${today}T12:00:00+05:30`)), today);
    const bad = pat.map((w, i) => ({ ...w, i })).filter((w) => w.eligible >= 3 && w.pct === 0 && isScheduled(h, dateOfWeekday(w.i, today)));
    if (bad.length === 1) {
      const w = bad[0];
      push({
        id: `${h.id}:skip:${w.i}`,
        habitId: h.id,
        kind: 'skip_day',
        title: `${DAY_NAMES[w.i]}s keep failing for "${h.name}"`,
        detail: `0 of ${w.eligible} ${DAY_NAMES[w.i]}s done. Either plan that day differently, or take it off the schedule. Your call.`,
        patch: { days: (h.days && h.days.length ? h.days : [0, 1, 2, 3, 4, 5, 6]).filter((d) => d !== w.i) },
      });
    }
    if (st.eligible >= 10 && st.pct !== null && st.pct >= 90 && !declined.has(`${h.id}:level_up`))
      push({
        id: `${h.id}:level_up`,
        habitId: h.id,
        kind: 'level_up',
        title: `"${h.name}" is solid. Raise the bar?`,
        detail: `${st.done} of ${st.eligible} answered days done. Add a small step up, for example 10% more, and keep the minimum version for bad days.`,
        patch: h.targetValue ? { targetValue: Math.ceil(h.targetValue * 1.1) } : {},
      });
  }
  return out;
}

/** The most recent date (<= today) that falls on the given weekday, so isScheduled can be asked about a weekday. */
function dateOfWeekday(wd: number, today: string) {
  for (let i = 0; i < 7; i++) {
    const d = dateKey(new Date(new Date(`${today}T12:00:00+05:30`).getTime() - i * 86400000));
    if (new Date(`${d}T12:00:00+05:30`).getUTCDay() === wd) return d;
  }
  return today;
}

export const habitMetaRows = (cols: Collections) => liveRows(cols, 'habit_meta');
