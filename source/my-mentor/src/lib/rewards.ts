// Badges and the Weekly Wins card. Everything is earned from real records; nothing is awarded for opening the app,
// nothing is taken away, and there are no leaderboards. Pure module.
import { attemptsOf, trend } from './comm-lab';
import { goalsOf } from './goals';
import { habitStreak } from './habit-stats';
import { habitsWithMeta } from './habits';
import { adherence, dateKey, lastNDates, level, streaks } from './metrics';
import { growthOf } from './business';
import type { State } from './store';

export type Badge = { key: string; emoji: string; title: string; how: string; earned: (s: State, today: string) => boolean };

const anyHabitStreak = (s: State, today: string) => Math.max(0, ...habitsWithMeta(s).map((h) => habitStreak({ habitLogs: s.habitLogs }, h, today)));
const answeredHours = (s: State) => Object.values(s.hours).filter((h) => h.status).length;
const oneThingDays = (s: State) => Object.values(s.oneThing).filter((o) => o.done).length;

export const BADGES: Badge[] = [
  { key: 'first-log', emoji: '🌱', title: 'First step', how: 'Record your first habit or check-in.', earned: (s) => Object.keys(s.habitLogs).length > 0 || answeredHours(s) > 0 },
  { key: 'streak-7', emoji: '🔥', title: 'Seven active days', how: 'A 7-day active streak.', earned: (s, t) => streaks(s, t).streak >= 7 },
  { key: 'streak-30', emoji: '🏔️', title: 'Thirty active days', how: 'A 30-day active streak.', earned: (s, t) => streaks(s, t).streak >= 30 },
  { key: 'habit-14', emoji: '🔗', title: 'A habit chain of 14', how: 'Do one habit 14 scheduled days in a row.', earned: (s, t) => anyHabitStreak(s, t) >= 14 },
  { key: 'comeback', emoji: '↺', title: 'Comeback', how: 'Return after 2 or more quiet days. Coming back counts more than never falling.', earned: (s, t) => streaks(s, t).comebacks >= 1 },
  { key: 'one-5', emoji: '🎯', title: 'Five One Things done', how: 'Finish your One Thing on 5 different days.', earned: (s) => oneThingDays(s) >= 5 },
  { key: 'hours-50', emoji: '⏱️', title: 'Fifty honest hours', how: 'Answer 50 hourly check-ins, done or not.', earned: (s) => answeredHours(s) >= 50 },
  { key: 'week-80', emoji: '🌟', title: 'A strong week', how: '80% or more habit adherence over 7 days (at least 10 answered habit-days).', earned: (s, t) => { const a = adherence(s, lastNDates(7, new Date(`${t}T12:00:00+05:30`))); return a.eligible >= 10 && (a.pct ?? 0) >= 80; } },
  { key: 'comm-5', emoji: '🎙️', title: 'Five practice rounds', how: 'Complete 5 Communication Lab attempts.', earned: (s) => attemptsOf(s.collections).length >= 5 },
  { key: 'comm-up', emoji: '📈', title: 'Speaking better', how: 'Average score up 10+ points after 6 attempts.', earned: (s) => (trend(attemptsOf(s.collections)).change ?? 0) >= 10 },
  { key: 'goal-done', emoji: '🏁', title: 'Goal reached', how: 'Mark any goal as done.', earned: (s) => goalsOf(s.collections).some((g) => g.status === 'done') },
  { key: 'growth-10', emoji: '🚀', title: 'Practice builder', how: 'Log 10 content, networking or referral actions.', earned: (s) => growthOf(s.collections).filter((g) => ['content', 'networking', 'referral'].includes(g.kind)).length >= 10 },
];

export function earnedKeys(s: State, today = dateKey()): string[] {
  return BADGES.filter((b) => b.earned(s, today)).map((b) => b.key);
}

/** Keys earned now but not yet stored. */
export function newlyEarned(s: State, today = dateKey()): Badge[] {
  const have = new Set(Object.values(s.collections.badges ?? {}).filter((r) => !r.deletedAt).map((r) => r.id));
  return BADGES.filter((b) => !have.has(b.key) && b.earned(s, today));
}

export function weeklyWins(s: State, today = dateKey()) {
  const days = lastNDates(7, new Date(`${today}T12:00:00+05:30`));
  const a = adherence(s, days);
  const st = streaks(s, today);
  const inWeek = (d: string) => days.includes(d);
  return {
    habitDone: a.done,
    adherencePct: a.pct,
    oneThingDone: Object.entries(s.oneThing).filter(([d, o]) => inWeek(d) && o.done).length,
    hoursAnswered: Object.entries(s.hours).filter(([k, h]) => inWeek(k.slice(0, 10)) && h.status).length,
    streak: st.streak,
    comebacks: st.comebacks,
    commAttempts: attemptsOf(s.collections).filter((x) => inWeek(x.createdAt.slice(0, 10))).length,
    level: level(s.xp).lvl,
    xp: s.xp,
  };
}
