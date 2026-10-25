// Discipline layer: water glasses, wake/sleep log, evening check-in + detox, and the daily discipline score.
// Pure module (no React / device imports). Everything is stored as rows of the existing `journal_entries` document
// collection (ids: water:DATE, wake:DATE, eve:DATE, cfg:disc), so it syncs under the existing owner-only RLS with no migration.
import { type Collections, liveRows } from './collections';
import { dateKey, lastNDates } from './metrics';

export type Role = 'arpan' | 'priya';

export type DiscConfig = {
  role: Role;
  waterTarget: number; // glasses per day
  wakeTarget: string; // HH:MM
  eveningCheckin: string; // HH:MM
  detoxCutoff: string; // HH:MM
  /** Nudge spacing in minutes while active (15, 30 or 60). */
  nudgeEvery: 15 | 30 | 60;
  nudgesOn: boolean;
  /** Priya: goals she chose (gym first). Empty means Krishna asks her to choose. */
  healthGoals: string[];
  /** Share my daily summary (score, water, One Thing done, habits, detox) with my partner in Couple Space. Off until chosen. */
  shareSummary: boolean;
  /** Monthly billing target in rupees (₹10 lakh by default). */
  monthlyTarget: number;
  /** Language of nudges: Hindi, English, or both (Hindi then English). */
  nudgeLang: 'hi' | 'en' | 'both';
  workDays: number[]; // 0 = Sunday … 6 = Saturday
};

export const DEFAULT_CONFIG: DiscConfig = {
  role: 'arpan',
  waterTarget: 8,
  wakeTarget: '06:00',
  eveningCheckin: '21:30',
  detoxCutoff: '22:30',
  nudgeEvery: 30,
  nudgeLang: 'both',
  healthGoals: [],
  shareSummary: false,
  monthlyTarget: 1000000,
  nudgesOn: false, // opt-in: turned on from Settings so nobody is nudged without choosing it
  workDays: [1, 2, 3, 4, 5, 6],
};

const row = (cols: Collections, id: string) => {
  const r = cols.journal_entries?.[id];
  return r && !r.deletedAt ? r : undefined;
};

export function configOf(cols: Collections): DiscConfig {
  const r = row(cols, 'cfg:disc');
  if (!r) return DEFAULT_CONFIG;
  const { role, waterTarget, wakeTarget, eveningCheckin, detoxCutoff, nudgeEvery, nudgesOn, nudgeLang, workDays, healthGoals, shareSummary, monthlyTarget } = r as Record<string, unknown>;
  return {
    role: role === 'priya' ? 'priya' : 'arpan',
    waterTarget: typeof waterTarget === 'number' && waterTarget > 0 ? Math.min(20, waterTarget) : DEFAULT_CONFIG.waterTarget,
    wakeTarget: typeof wakeTarget === 'string' ? wakeTarget : DEFAULT_CONFIG.wakeTarget,
    eveningCheckin: typeof eveningCheckin === 'string' ? eveningCheckin : DEFAULT_CONFIG.eveningCheckin,
    detoxCutoff: typeof detoxCutoff === 'string' ? detoxCutoff : DEFAULT_CONFIG.detoxCutoff,
    nudgeEvery: nudgeEvery === 15 || nudgeEvery === 60 ? nudgeEvery : 30,
    nudgesOn: nudgesOn === true,
    healthGoals: Array.isArray(healthGoals) ? (healthGoals as unknown[]).filter((g): g is string => typeof g === 'string').slice(0, 8) : [],
    shareSummary: shareSummary === true,
    monthlyTarget: typeof monthlyTarget === 'number' && monthlyTarget > 0 ? Math.min(1e9, monthlyTarget) : DEFAULT_CONFIG.monthlyTarget,
    nudgeLang: nudgeLang === 'hi' || nudgeLang === 'en' ? nudgeLang : 'both',
    workDays: Array.isArray(workDays) ? (workDays as number[]) : DEFAULT_CONFIG.workDays,
  };
}

export const configRow = (c: Partial<DiscConfig>) => ({ id: 'cfg:disc', kind: 'config', ...c });

// ---------- Water ----------
export const waterOn = (cols: Collections, date: string): number => {
  const g = row(cols, `water:${date}`)?.glasses;
  return typeof g === 'number' && g > 0 ? Math.floor(g) : 0;
};
/** The row to write for a new glass count (never negative, capped at 30 to absorb accidental taps). */
export const waterRow = (date: string, glasses: number) => ({ id: `water:${date}`, kind: 'water', date, glasses: Math.max(0, Math.min(30, Math.floor(glasses))) });

/** Consecutive days (ending today, or yesterday if today is not finished yet) that met the target. */
export function waterStreak(cols: Collections, target: number, today = dateKey()): number {
  const days = lastNDates(120, new Date(`${today}T12:00:00+05:30`));
  let n = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (waterOn(cols, days[i]) >= target) n++;
    else if (i === days.length - 1) continue; // today still open
    else break;
  }
  return n;
}
export function waterTotals(cols: Collections, today = dateKey()) {
  const sum = (n: number) => lastNDates(n, new Date(`${today}T12:00:00+05:30`)).reduce((a, d) => a + waterOn(cols, d), 0);
  return { week: sum(7), month: sum(30) };
}
/** Parses "drank two glasses" / "2 glass paani piya" style chat text. Returns null when there is no clear count. */
export function glassesFromText(text: string): number | null {
  const t = text.toLowerCase();
  if (!/(glass|gilas|glaas|paani|pani|water)/.test(t)) return null;
  const words: Record<string, number> = { one: 1, ek: 1, two: 2, do: 2, three: 3, teen: 3, four: 4, char: 4, chaar: 4, five: 5, paanch: 5, six: 6, chhe: 6, seven: 7, saat: 7, eight: 8, aath: 8 };
  const num = t.match(/\b(\d{1,2})\b/);
  if (num) return Math.min(10, Number(num[1])) || null;
  for (const [w, n] of Object.entries(words)) if (new RegExp(`\\b${w}\\b`).test(t)) return n;
  return /\ba glass\b|\bglass\b/.test(t) ? 1 : null;
}

// ---------- Wake / sleep ----------
export type WakeEntry = { date: string; time: string; sleptAt?: string };
export const wakeOf = (cols: Collections, date: string): WakeEntry | undefined => {
  const r = row(cols, `wake:${date}`);
  return r && typeof r.time === 'string' ? { date, time: r.time, sleptAt: typeof r.sleptAt === 'string' ? r.sleptAt : undefined } : undefined;
};
export const wakeRow = (date: string, time: string, sleptAt?: string) => ({ id: `wake:${date}`, kind: 'wake', date, time, ...(sleptAt ? { sleptAt } : {}) });

const mins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
/** Minutes past the wake target (0 when on time or early). */
export const lateByMin = (time: string, target: string) => Math.max(0, mins(time) - mins(target));
/** The first open after 05:00 IST records the wake time; later opens never overwrite it. */
export const shouldRecordWake = (cols: Collections, now = new Date()) => {
  const ist = new Date(now.getTime() + 330 * 60000);
  const h = ist.getUTCHours();
  return h >= 5 && h < 14 && !wakeOf(cols, dateKey(now));
};
export const clockIst = (now = new Date()) => new Date(now.getTime() + 330 * 60000).toISOString().slice(11, 16);

// ---------- Evening check-in + detox ----------
export type Evening = { date: string; detoxFree: boolean; shipped: string; fix: string };
export const eveningOf = (cols: Collections, date: string): Evening | undefined => {
  const r = row(cols, `eve:${date}`);
  return r ? { date, detoxFree: r.detoxFree === true, shipped: String(r.shipped ?? ''), fix: String(r.fix ?? '') } : undefined;
};
export const eveningRow = (e: Evening) => ({ id: `eve:${e.date}`, kind: 'evening', ...e });
export function detoxStreak(cols: Collections, today = dateKey()): number {
  const days = lastNDates(120, new Date(`${today}T12:00:00+05:30`));
  let n = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const e = eveningOf(cols, days[i]);
    if (e?.detoxFree) n++;
    else if (i === days.length - 1 && !e) continue;
    else break;
  }
  return n;
}

// ---------- Discipline score ----------
export type ScoreInput = {
  planned: number; // planned items today: planner items + scheduled habits + One Thing (if set)
  done: number;
  streakDays: number; // active-day streak from metrics.streaks
  detoxStreak: number;
  waterMet: boolean;
};
export type Score = { score: number | null; base: number | null; bonus: number; label: string };
/**
 * Score = done ÷ planned × 100, plus a streak bonus (max +10: +1 per active day up to 7, +1 for detox streak ≥3, +2 for water met).
 * With nothing planned there is no score: an empty plan is "unknown", not 0 (the same honesty rule as habit adherence).
 */
export function disciplineScore(i: ScoreInput): Score {
  const bonus = Math.min(7, i.streakDays) + (i.detoxStreak >= 3 ? 1 : 0) + (i.waterMet ? 2 : 0);
  if (i.planned <= 0) return { score: null, base: null, bonus, label: 'Kuch plan nahi kiya: pehle aaj ka One Thing set karo.' };
  const base = Math.round((Math.min(i.done, i.planned) / i.planned) * 100);
  const score = Math.min(100, base + bonus);
  const label = score >= 80 ? 'Strong din.' : score >= 50 ? 'Theek hai, par aur kheench sakte ho.' : 'Aaj kamzor raha: abhi ek chhota kaam khatam karo.';
  return { score, base, bonus, label };
}
