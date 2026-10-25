// Pure planner for accountability notifications (no device APIs, so it is unit-tested).
// Deliberately has no runtime imports so Node's test runner can load it directly.
import type { Profile } from './store';

const dateKey = (d: Date) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10); // same as metrics.dateKey (IST)

export const DAYS = 3;
export const HOURLY_CATEGORY = 'hourly';

export type NotifSettings = {
  enabled: boolean;
  /** Extra reminders; all default to on when undefined. */
  preEvent?: boolean;
  weeklyReview?: boolean;
  followUp?: boolean;
  easeOff?: boolean;
  pausedUntil?: string; // ISO
  pauseLabel?: string;
};

/** Things the planner needs from the app's data (kept as plain values so this file stays pure). */
export type PlanExtras = {
  /** Planner items with a clock time: reminded lead minutes before. */
  events?: { day: string; time: string; title: string; lead?: number }[];
  /** How many of the most recent past hourly check-ins today were left unanswered. */
  ignoredRecent?: number;
  /** Adaptive 6 AM–11 PM nudges (opt-in). `line` returns the text for a given IST hour/minute, or null for none. */
  /** Fixed daily notifications (timesheet review, evening check-in, detox). `days` limits by weekday (0 = Sunday). */
  fixed?: { time: string; title: string; body: string; route: string; kind: string; days?: number[] }[];
  nudges?: { gapMin: number; line: (hour: number, minute: number, weekday: number) => { title: string; body: string; route: string } | null };
};

export type Planned = { at: Date; title: string; body: string; data: Record<string, string>; category?: string };

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const fmt = (mins: number) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
/** Is clock time `t` (minutes) inside [start, end), allowing windows that cross midnight? */
export const inWindow = (t: number, start: number, end: number) => (start <= end ? t >= start && t < end : t >= start || t < end);

/** IST wall-clock → absolute Date. */
const istDate = (day: string, mins: number) => new Date(`${day}T${fmt(mins)}:00+05:30`);

const LINES = ['Did you do what you planned this hour?', 'Hour check: done, partly or missed?', 'One tap: how did the last hour go?'];

/** What should be scheduled for the next DAYS days, given settings and "now". */
export function planNotifications(p: Profile, s: NotifSettings, now = new Date(), x: PlanExtras = {}): Planned[] {
  if (!s.enabled) return [];
  const out: Planned[] = [];
  const quietS = toMin(p.quietStart);
  const quietE = toMin(p.quietEnd);
  const pausedUntil = s.pausedUntil ? new Date(s.pausedUntil).getTime() : 0;
  const ok = (at: Date, mins: number) =>
    at.getTime() > now.getTime() + 30000 && at.getTime() >= pausedUntil && !inWindow(((mins % 1440) + 1440) % 1440, quietS, quietE);

  for (let i = 0; i < DAYS; i++) {
    const day = dateKey(new Date(now.getTime() + i * 86400000));

    const morning = toMin(p.wake) + 15;
    const mAt = istDate(day, morning);
    if (ok(mAt, morning)) out.push({ at: mAt, title: 'Good morning 🌅', body: "What's your One Thing today? Set it in under a minute.", data: { kind: 'morning', day } });

    // At each full hour after the window opens, ask about the hour that just ended.
    const start = Math.ceil(toMin(p.intensiveStart) / 60) * 60 + 60;
    const end = toMin(p.intensiveEnd);
    // Ease off: if the last 3+ check-ins were ignored, ask every second hour instead of every hour (nagging an ignored person does not help).
    const easing = s.easeOff !== false && (x.ignoredRecent ?? 0) >= 3;
    for (let m = start, n = 0; m <= end; m += 60, n++) {
      if (easing && n % 2 === 1) continue;
      const at = istDate(day, m);
      if (!ok(at, m)) continue;
      out.push({
        at,
        title: `${fmt(m - 60)}–${fmt(m)} check-in`,
        body: LINES[n % LINES.length],
        data: { kind: 'hourly', key: `${day}:${fmt(m - 60).slice(0, 2)}` },
        category: HOURLY_CATEGORY,
      });
    }

    const evening = toMin(p.sleep) - 60;
    const eAt = istDate(day, evening);
    if (ok(eAt, evening))
      out.push({ at: eAt, title: 'Evening review 🌙', body: 'Two minutes: what got done today, and what is tomorrow’s One Thing?', data: { kind: 'evening', day } });
  }
  for (const f of x.fixed ?? []) {
    for (let i = 0; i < DAYS; i++) {
      const day = dateKey(new Date(now.getTime() + i * 86400000));
      const wd = new Date(`${day}T12:00:00+05:30`).getUTCDay();
      if (f.days && !f.days.includes(wd)) continue;
      const m = toMin(f.time);
      const at = istDate(day, m);
      if (ok(at, m)) out.push({ at, title: f.title, body: f.body, data: { kind: f.kind, day, route: f.route } });
    }
  }

  // Adaptive nudges: today and tomorrow only (a short horizon keeps the scheduled count low and the content fresh).
  if (x.nudges) {
    const gap = x.nudges.gapMin;
    for (let i = 0; i < 2; i++) {
      const day = dateKey(new Date(now.getTime() + i * 86400000));
      for (let m = Math.ceil((6 * 60) / gap) * gap; m < 23 * 60; m += gap) {
        const at = istDate(day, m);
        if (!ok(at, m)) continue;
        // Skip a slot that sits within 10 minutes of another planned notification, so two never arrive together.
        if (out.some((o) => Math.abs(o.at.getTime() - at.getTime()) < 10 * 60000)) continue;
        const line = x.nudges.line(Math.floor(m / 60), m % 60, new Date(`${day}T12:00:00+05:30`).getUTCDay());
        if (line) out.push({ at, title: line.title, body: line.body, data: { kind: 'nudge', day, route: line.route } });
      }
    }
  }

  // Follow-up on unanswered check-ins: one gentle catch-up nudge, not a barrage.
  if (s.followUp !== false && (x.ignoredRecent ?? 0) >= 2) {
    const at = new Date(now.getTime() + 25 * 60000);
    const mins = toMin(fmt(Math.floor((at.getTime() + 330 * 60000) / 60000) % 1440));
    if (ok(at, mins)) out.push({ at, title: 'Quick catch-up?', body: 'A few check-ins are unanswered. Tap once to mark them all, no judgement.', data: { kind: 'followup' } });
  }

  // Pre-event reminders for planner items that have a time.
  if (s.preEvent !== false) {
    for (const e of x.events ?? []) {
      const m = toMin(e.time) - (e.lead ?? 15);
      const at = istDate(e.day, m);
      if (at.getTime() < now.getTime() + DAYS * 86400000 && ok(at, m)) out.push({ at, title: `Coming up: ${e.title.slice(0, 60)}`, body: `Starts at ${e.time}. Take two minutes to get ready.`, data: { kind: 'event', day: e.day } });
    }
  }

  // Weekly planning review: Sunday 6 pm India time.
  if (s.weeklyReview !== false) {
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(now.getTime() + i * 86400000);
      const day = dateKey(d);
      if (new Date(`${day}T12:00:00+05:30`).getUTCDay() !== 0) continue;
      const m = 18 * 60;
      const at = istDate(day, m);
      if (ok(at, m)) out.push({ at, title: 'Plan your week 🗓️', body: 'Ten minutes now saves hours later. Set 3 priorities for the week.', data: { kind: 'weekly', day } });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
