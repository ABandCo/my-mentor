// To-dos made clear: every item has a title, priority, duration and (optionally) a time block.
// Today is split into Overdue / Now / Next / Later. Pure module; items live in the `planner_items` collection.
export type Priority = 'high' | 'med' | 'low';
export type Todo = { id: string; title: string; date: string; time?: string; durationMin?: number; priority?: Priority; done?: boolean };

export const DEFAULT_DURATION = 30;
export const PRIORITIES: { key: Priority; label: string }[] = [
  { key: 'high', label: 'High' },
  { key: 'med', label: 'Medium' },
  { key: 'low', label: 'Low' },
];
const RANK: Record<Priority, number> = { high: 0, med: 1, low: 2 };
const rank = (t: Todo) => RANK[t.priority ?? 'med'];
const mins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
export const endMin = (t: Todo) => mins(t.time!) + (t.durationMin ?? DEFAULT_DURATION);

export type Buckets = { overdue: Todo[]; now: Todo[]; next: Todo[]; later: Todo[] };

/**
 * today: the IST date; nowMin: IST minutes since midnight.
 * - Overdue: not done and either on an earlier day, or today with a time block that has already ended.
 * - Now: a timed block happening right now; if none, the single top-priority untimed item (the one to start).
 * - Next: the next upcoming timed blocks today (max 3).
 * - Later: everything else for today (untimed by priority, then later blocks).
 */
export function bucketsFor(items: Todo[], today: string, nowMin: number): Buckets {
  const open = items.filter((i) => !i.done);
  const byTime = (a: Todo, b: Todo) => mins(a.time ?? '99:99') - mins(b.time ?? '99:99') || rank(a) - rank(b);
  const overdue = open
    .filter((i) => i.date < today || (i.date === today && i.time && endMin(i) <= nowMin))
    .sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b));
  const od = new Set(overdue.map((i) => i.id));
  const todays = open.filter((i) => i.date === today && !od.has(i.id));
  const timed = todays.filter((i) => i.time).sort(byTime);
  const untimed = todays.filter((i) => !i.time).sort((a, b) => rank(a) - rank(b));
  const active = timed.filter((i) => mins(i.time!) <= nowMin && nowMin < endMin(i));
  const upcoming = timed.filter((i) => mins(i.time!) > nowMin);
  const now = active.length ? active : untimed.slice(0, 1);
  const next = upcoming.slice(0, 3);
  const later = [...(active.length ? untimed : untimed.slice(1)), ...upcoming.slice(3)];
  return { overdue, now, next, later };
}

export const minutesLeftToday = (b: Buckets) => [...b.overdue, ...b.now, ...b.next, ...b.later].reduce((a, i) => a + (i.durationMin ?? DEFAULT_DURATION), 0);
