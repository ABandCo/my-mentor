// The "push-hard" coach. Everything here is computed from the person's own records, so every push can say
// exactly WHY ("3 of your last 5 Tuesdays..."). Firm, specific, never shaming; unrecorded days are never called misses.
import { liveRows } from './collections';
import { type Goal, goalsOf, paceOf, daysLeft } from './goals';
import { habitStreak, slippingHabits, weekdayPattern } from './habit-stats';
import { habitsWithMeta } from './habits';
import { adherence, dateKey, istHour, lastNDates } from './metrics';
import type { State } from './store';

export type Push = {
  id: string;
  severity: 'high' | 'medium' | 'low' | 'win';
  title: string;
  body: string;
  action?: { label: string; route: string };
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDER = { high: 0, medium: 1, low: 2, win: 3 } as const;

export function pushList(s: State, now = new Date()): Push[] {
  const out: Push[] = [];
  const today = dateKey(now);
  const hour = istHour(now);
  const habits = habitsWithMeta(s);
  const base = { habitLogs: s.habitLogs };
  const wd = new Date(`${today}T12:00:00+05:30`).getUTCDay();

  // 1) Habits slipping (last 14 days under 50% of answered days).
  for (const x of slippingHabits(base, habits, today).slice(0, 3)) {
    out.push({
      id: `slip:${x.h.id}`,
      severity: (x.st.pct ?? 0) < 25 ? 'high' : 'medium',
      title: `${x.h.name}: ${x.st.done} of ${x.st.eligible} answered days`,
      body: `That is ${x.st.pct}% over two weeks. What got in the way: time, energy, or the habit being too big? ${x.h.minVersion ? `Do the minimum version today: ${x.h.minVersion}.` : 'Do a 2-minute version today so the chain restarts.'}`,
      action: { label: 'Open habit', route: `/habit/${x.h.id}` },
    });
  }

  // 2) Today is a known weak weekday for a habit.
  const month = lastNDates(42, now);
  for (const h of habits) {
    const w = weekdayPattern(base, h, month, today)[wd];
    const done = base.habitLogs[today]?.[h.id];
    if (w.eligible >= 3 && (w.pct ?? 100) <= 34 && !done)
      out.push({
        id: `weak:${h.id}:${wd}`,
        severity: 'medium',
        title: `${WEEKDAYS[wd]}s are your hard day for "${h.name}"`,
        body: `Only ${w.done} of ${w.eligible} recent ${WEEKDAYS[wd]}s were done. Decide now when you will do it today, not later.`,
        action: { label: 'Plan it', route: '/planner' },
      });
  }

  // 3) Goals behind pace or overdue.
  const goals: Goal[] = goalsOf(s.collections).filter((g) => g.status === 'active');
  for (const g of goals) {
    const p = paceOf(g, goals, today);
    if (p.pace === 'behind' || p.pace === 'overdue') {
      const dl = daysLeft(g, today);
      out.push({
        id: `goal:${g.id}`,
        severity: p.pace === 'overdue' ? 'high' : 'medium',
        title: `Goal behind: ${g.title}`,
        body: `${Math.round(p.progress * 100)}% done with ${Math.round((p.expected ?? 0) * 100)}% of the time used${dl !== null && dl >= 0 ? ` (${dl} days left)` : dl !== null ? ` (${-dl} days overdue)` : ''}. What is the next concrete step, and when?`,
        action: { label: 'Open goals', route: '/goals' },
      });
    }
  }

  // 4) Overdue commitments.
  const overdue = s.commitments.filter((c) => !c.done && c.due && c.due.slice(0, 10) < today);
  if (overdue.length)
    out.push({
      id: 'overdue',
      severity: overdue.length >= 3 ? 'high' : 'medium',
      title: `${overdue.length} overdue commitment${overdue.length > 1 ? 's' : ''}`,
      body: `Oldest: "${overdue[0].text}". Finish it, move it with a real date, or drop it on purpose. Carrying it silently costs you.`,
      action: { label: 'Review', route: '/' },
    });

  // 5) Today: One Thing not set (after 10 am) or not done (after 5 pm).
  const one = s.oneThing[today];
  if (!one && hour >= 10 && hour < 22) out.push({ id: 'no-one', severity: 'medium', title: "No One Thing set for today", body: 'It is already late morning. Name the single outcome that makes today a win, in one line.', action: { label: 'Set it', route: '/' } });
  if (one && !one.done && hour >= 17) out.push({ id: 'one-open', severity: 'high', title: `Your One Thing is still open`, body: `"${one.text}". There are still hours left. Give it 25 focused minutes right now.`, action: { label: 'Go', route: '/' } });

  // 6) Evening and nothing logged at all: protect the streak.
  const loggedToday = Object.keys(s.habitLogs[today] ?? {}).length;
  if (habits.length && !loggedToday && hour >= 19) out.push({ id: 'nothing-logged', severity: 'medium', title: 'Nothing logged today', body: 'Two minutes: tick what you did, even if it was little. Honest records are what make this work.', action: { label: 'Log habits', route: '/habits' } });

  // 7) Several days with no habit record (honest: unknown, not failed).
  const last3 = lastNDates(3, now);
  if (habits.length && last3.every((d) => d === today || !Object.keys(s.habitLogs[d] ?? {}).length) && !loggedToday)
    out.push({ id: 'gap', severity: 'low', title: 'A few days without records', body: 'I cannot tell how you are doing without records. A one-tap log today restarts the picture.', action: { label: 'Log now', route: '/habits' } });

  // Wins (only real ones).
  for (const h of habits) {
    const st = habitStreak(base, h, today);
    if (st >= 7 && st % 7 === 0) out.push({ id: `win:${h.id}:${st}`, severity: 'win', title: `${st} days in a row: ${h.name}`, body: 'That is recorded, not guessed. Keep the minimum version ready for a bad day.' });
  }
  const a = adherence(s, lastNDates(7, now));
  if (a.pct !== null && a.eligible >= 8 && a.pct >= 80) out.push({ id: 'win-week', severity: 'win', title: `${a.pct}% habit adherence this week`, body: `${a.done} of ${a.eligible} answered habit-days done. Raise one habit by a small step.` });

  return out.sort((x, y) => ORDER[x.severity] - ORDER[y.severity]).slice(0, 8);
}

/** Habit/goal numbers the mentor AI may see (all computed, no free text). */
export function insightsForAi(s: State, now = new Date()) {
  const p = pushList(s, now).filter((x) => x.severity !== 'win');
  const goals = goalsOf(s.collections).filter((g) => g.status === 'active');
  const today = dateKey(now);
  return {
    pushesDueToday: p.slice(0, 5).map((x) => ({ severity: x.severity, title: x.title })),
    goals: goals.slice(0, 8).map((g) => {
      const q = paceOf(g, goals, today);
      return { title: g.title, horizon: g.horizon, progressPct: Math.round(q.progress * 100), pace: q.pace, due: g.due ?? null };
    }),
    plannerToday: liveRows(s.collections, 'planner_items')
      .filter((r) => r.date === today)
      .slice(0, 10)
      .map((r) => ({ title: String(r.title ?? ''), time: (r.time as string) ?? null, done: !!r.done })),
  };
}
