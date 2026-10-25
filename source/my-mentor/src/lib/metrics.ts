// Honest metrics. Every formula here is shown to the user in a "How this is calculated" sheet.
import type { State } from './store';

// India time by default (Asia/Kolkata, UTC+5:30, no daylight saving), independent of device timezone.
// Shift the instant by +5:30 and read the UTC fields, which then equal the IST wall clock.
const IST_MS = 330 * 60000;
export const dateKey = (d = new Date()) => new Date(d.getTime() + IST_MS).toISOString().slice(0, 10);
export const istHour = (d = new Date()) => new Date(d.getTime() + IST_MS).getUTCHours();
export const hourKey = (d = new Date()) => `${dateKey(d)}:${String(istHour(d)).padStart(2, '0')}`;

export function lastNDates(n: number, from = new Date()) {
  return Array.from({ length: n }, (_, i) => dateKey(new Date(from.getTime() - (n - 1 - i) * 86400000)));
}

/**
 * Habit adherence = completed eligible instances ÷ eligible instances × 100.
 * Eligible = days since the habit existed, excluding rest-day and not-applicable.
 * Unrecorded days are reported separately and are NOT counted as missed.
 */
export function adherence(state: State, dates: string[]) {
  let eligible = 0;
  let done = 0;
  let partial = 0;
  let missed = 0;
  let unrecorded = 0;
  let excused = 0;
  for (const h of state.habits) {
    const born = dateKey(new Date(h.createdAt));
    for (const d of dates) {
      if (d < born) continue;
      const st = state.habitLogs[d]?.[h.id];
      if (st === 'rest' || st === 'na') excused++;
      else if (!st) unrecorded++;
      else {
        eligible++;
        if (st === 'done') done++;
        else if (st === 'partial') partial++;
        else missed++;
      }
    }
  }
  return { pct: eligible ? Math.round((done / eligible) * 100) : null, eligible, done, partial, missed, unrecorded, excused };
}

/** A day is "active" if any honest record exists (habit log, hour check-in, or One Thing done). */
export function isActiveDay(state: State, d: string) {
  if (Object.keys(state.habitLogs[d] ?? {}).length) return true;
  if (state.oneThing[d]?.done) return true;
  return Object.entries(state.hours).some(([k, v]) => k.startsWith(d) && v.status);
}

/** Streak with grace: one missed day per rolling 7 is shielded. Comebacks = returns after a gap of ≥2 days. */
export function streaks(state: State, today = dateKey()) {
  const days = lastNDates(120, new Date(`${today}T12:00:00+05:30`));
  let streak = 0;
  let lastShield: number | null = null;
  for (let i = days.length - 1; i >= 0; i--) {
    if (isActiveDay(state, days[i])) streak++;
    else if (i === days.length - 1) continue; // today is not over yet
    else if (lastShield === null || lastShield - i >= 7) lastShield = i; // shield absorbs the miss
    else break;
  }
  let comebacks = 0;
  let gap = 0;
  let started = false; // days before first use are not a "gap"
  for (const d of days) {
    if (isActiveDay(state, d)) {
      if (started && gap >= 2) comebacks++;
      started = true;
      gap = 0;
    } else gap++;
  }
  return { streak, comebacks };
}

export const level = (xp: number) => {
  const lvl = Math.floor(Math.sqrt(xp / 50)) + 1;
  const base = 50 * (lvl - 1) ** 2;
  const next = 50 * lvl ** 2;
  return { lvl, progress: (xp - base) / (next - base), toNext: next - xp };
};
