// Today's numbers in one place (used by the Today card and by the Couple Space summary).
import { liveRows } from './collections';
import { clockIst, configOf, detoxStreak, disciplineScore, eveningOf, wakeOf, waterOn } from './discipline';
import { isScheduled } from './habit-stats';
import { habitsWithMeta } from './habits';
import { streaks } from './metrics';
import type { State } from './store';

export function dayStats(state: State, today: string) {
  const cols = state.collections;
  const cfg = configOf(cols);
  const items = liveRows(cols, 'planner_items').filter((r) => r.date === today);
  const habits = habitsWithMeta(state).filter((h) => isScheduled(h, today));
  const one = state.oneThing[today];
  const logs = state.habitLogs[today] ?? {};
  const habitsDone = habits.filter((h) => logs[h.id] === 'done').length;
  const planned = items.length + habits.length + (one ? 1 : 0);
  const done = items.filter((r) => r.done).length + habitsDone + (one?.done ? 1 : 0);
  const water = waterOn(cols, today);
  const eve = eveningOf(cols, today);
  const score = disciplineScore({ planned, done, streakDays: streaks(state).streak, detoxStreak: detoxStreak(cols, today), waterMet: water >= cfg.waterTarget });
  return {
    score,
    water,
    waterTarget: cfg.waterTarget,
    habitsDone,
    habitsTotal: habits.length,
    oneThingDone: one ? !!one.done : null,
    detoxFree: eve ? eve.detoxFree : null,
    woke: wakeOf(cols, today)?.time ?? null,
    clock: clockIst(),
  };
}
