// Builds the "recorded facts" the mentor may see. Only real records; never estimates. Kept small (a few KB).
import { bestStreak, habitStats, habitStreak, lastStatuses, slippingHabits, weekdayPattern } from '../habit-stats';
import { configOf, detoxStreak, eveningOf, wakeOf, waterOn, waterStreak } from '../discipline';
import { adherence, dateKey, istHour, lastNDates, streaks } from '../metrics';
import { insightsForAi } from '../push-coach';
import type { State } from '../store';

export type Category = 'plans' | 'work' | 'health' | 'journal';
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function buildContext(s: State, cats: Category[], now = new Date()): Record<string, unknown> {
  const ctx: Record<string, unknown> = {};
  if (!cats.includes('plans')) return ctx;
  const today = dateKey(now);
  const week = lastNDates(7, now);
  const fortnight = lastNDates(14, now);
  const month = lastNDates(28, now);

  const p = s.profile;
  ctx.profile = {
    language: p.language,
    coachingStyle: p.coachingStyle,
    wake: p.wake,
    sleep: p.sleep,
    hourlyCheckInWindow: `${p.intensiveStart}-${p.intensiveEnd}`,
    quietHours: `${p.quietStart}-${p.quietEnd}`,
    baselinesEnteredByUser: p.baselines,
  };

  const dc = configOf(s.collections);
  const wk = wakeOf(s.collections, today);
  ctx.discipline = {
    role: dc.role, // 'arpan' | 'priya': picks Krishna's voice (see prompt rules)
    waterToday: `${waterOn(s.collections, today)}/${dc.waterTarget}`,
    waterStreakDays: waterStreak(s.collections, dc.waterTarget, today),
    wakeTarget: dc.wakeTarget,
    wokeAt: wk?.time ?? 'not recorded',
    detoxFreeStreakDays: detoxStreak(s.collections, today),
    eveningCheckinDone: !!eveningOf(s.collections, today),
  };

  const hours = Object.entries(s.hours)
    .filter(([k]) => k.startsWith(today))
    .map(([k, v]) => ({ hour: Number(k.split(':')[1]), plan: v.plan, status: v.status ?? 'unanswered' }))
    .sort((a, b) => a.hour - b.hour);
  const one = s.oneThing[today];
  ctx.today = {
    date: today,
    weekday: WEEKDAYS[new Date(`${today}T12:00:00+05:30`).getUTCDay()],
    nowHourIST: istHour(now),
    oneThing: one ? { text: one.text, done: one.done } : 'not set',
    hourCheckIns: hours,
    energy1to5: s.mood[today] ?? 'not recorded',
    habits: s.habits.map((h) => ({ name: h.name, status: s.habitLogs[today]?.[h.id] ?? 'unrecorded' })),
  };

  const a = adherence(s, week);
  const st = streaks(s, today);
  ctx.week = {
    habitAdherencePct: a.pct,
    doneHabitDays: a.done,
    partialHabitDays: a.partial,
    missedHabitDays: a.missed,
    unrecordedHabitDays: a.unrecorded,
    restOrNotApplicableDays: a.excused,
    activeDayStreak: st.streak,
    comebacks: st.comebacks,
    levelXp: s.xp,
  };

  ctx.habits = s.habits.map((h) => {
    const s14 = habitStats(s, h, fortnight, today);
    const pat = weekdayPattern(s, h, month, today)
      .map((w, i) => ({ ...w, day: WEEKDAYS[i] }))
      .filter((w) => w.eligible >= 2 && w.pct !== null)
      .sort((x, y) => (x.pct as number) - (y.pct as number))[0];
    return {
      name: h.name,
      currentStreak: habitStreak(s, h, today),
      bestStreak: bestStreak(s, h, today),
      last7: lastStatuses(s, h, 7, today),
      last14: { done: s14.done, missed: s14.missed, partial: s14.partial, unrecorded: s14.unrecorded, pct: s14.pct },
      ...(pat && (pat.pct as number) < 50 ? { weakestWeekday: `${pat.day} (${pat.done}/${pat.eligible} done)` } : {}),
    };
  });

  const slipping = slippingHabits(s, s.habits, today).map((x) => x.h.name);
  if (slipping.length) (ctx.week as Record<string, unknown>).habitsSlippingUnder50pct = slipping;

  ctx.commitments = s.commitments
    .filter((c) => !c.done)
    .slice(0, 10)
    .map((c) => ({ text: c.text, due: c.due ?? null, overdue: !!c.due && c.due.slice(0, 10) < today }));

  const ins = insightsForAi(s, now);
  if (ins.goals.length) ctx.goals = ins.goals;
  ctx.insights = { pushesDueToday: ins.pushesDueToday, plannerToday: ins.plannerToday };

  return ctx;
}

export function contextCategories(profile: State['profile']): Category[] {
  if (!profile.aiConsentGeneral) return [];
  return profile.aiConsentSensitive ? ['plans', 'work', 'health', 'journal'] : ['plans', 'work'];
}
