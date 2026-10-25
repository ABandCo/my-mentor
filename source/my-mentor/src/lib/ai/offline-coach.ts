// A rules-only coach that works with no internet and no AI quota. It only uses recorded facts and never shames.
// Strict by default (the user's choice) but always ends with ONE concrete next step.
import { habitStats, slippingHabits } from '../habit-stats';
import { dateKey, istHour, lastNDates } from '../metrics';
import type { State } from '../store';

export type Nudge = { id: string; title: string; body: string; tone: 'firm' | 'warm' | 'celebrate' };

export function offlineCoach(s: State, now = new Date()): Nudge {
  const today = dateKey(now);
  const hour = istHour(now);
  const strict = s.profile.coachingStyle === 'strict' || s.profile.coachingStyle === 'business';
  const fortnight = lastNDates(14, now);

  if (s.habits.length === 0 && !s.oneThing[today]) {
    return { id: 'start', title: 'Start small, start now', body: 'Nothing is planned yet. Write today\'s One Thing: the single outcome that would make today a win. Then plant one tiny habit.', tone: 'warm' };
  }

  // Missed hours today
  const missedToday = Object.entries(s.hours).filter(([k, v]) => k.startsWith(today) && v.status === 'missed').length;
  if (missedToday >= 3) {
    return {
      id: 'reset',
      title: 'Reset, not repair',
      body: `${missedToday} hour check-ins are recorded as missed today. You don't need to repair the whole day. Pick one 10-minute action and do only that. Which one?`,
      tone: 'warm',
    };
  }

  const slip = slippingHabits(s, s.habits, today)[0];
  if (slip) {
    const st = slip.st;
    return {
      id: `slip-${slip.h.id}`,
      title: `${slip.h.name}: slipping`,
      body: strict
        ? `${slip.h.name} is recorded done on ${st.done} of ${st.eligible} recorded days in the last two weeks (${st.pct}%). Another reminder won't fix that. What is blocking it, and what is the smallest version you can do today?`
        : `${slip.h.name} has been hard lately: ${st.done} of ${st.eligible} recorded days. What would make it easier? Try the tiniest version today.`,
      tone: 'firm',
    };
  }

  const overdue = s.commitments.filter((c) => !c.done && c.due && c.due.slice(0, 10) < today);
  if (overdue.length) {
    return {
      id: 'overdue',
      title: `${overdue.length} overdue`,
      body: strict
        ? `Overdue: "${overdue[0].text}". Finish it today or renegotiate it honestly. Which one will you do?`
        : `"${overdue[0].text}" is overdue. Shall we finish it or set a new realistic date?`,
      tone: 'firm',
    };
  }

  const one = s.oneThing[today];
  if (!one && hour >= 9) return { id: 'noone', title: 'No One Thing yet', body: 'The day is moving. Name the one outcome that matters most today and start on it.', tone: 'firm' };
  if (one && !one.done && hour >= 15) {
    return { id: 'onenotdone', title: 'Your One Thing', body: `"${one.text}" is not recorded as done and it is past 3 pm. What exactly is in the way, and can you do the first 15 minutes now?`, tone: 'firm' };
  }

  const unlogged = s.habits.filter((h) => !s.habitLogs[today]?.[h.id]);
  if (unlogged.length && hour >= 20) {
    return { id: 'unlogged', title: 'Close the day', body: `${unlogged.length} habit(s) are still unrecorded today (${unlogged.slice(0, 3).map((h) => h.name).join(', ')}). Log honestly: done, partial, missed or rest.`, tone: 'warm' };
  }

  const best = s.habits.map((h) => ({ h, st: habitStats(s, h, fortnight, today) })).filter((x) => x.st.pct !== null && x.st.eligible >= 3).sort((a, b) => (b.st.pct ?? 0) - (a.st.pct ?? 0))[0];
  if (best && (best.st.pct ?? 0) >= 70) {
    return { id: `win-${best.h.id}`, title: 'Real progress', body: `${best.h.name}: done ${best.st.done} of ${best.st.eligible} recorded days (${best.st.pct}%). That is recorded, not hoped. Keep it boringly consistent.`, tone: 'celebrate' };
  }
  return { id: 'steady', title: 'Steady', body: 'Nothing is slipping on the records. Use the next hour on your One Thing, then log it.', tone: 'warm' };
}
