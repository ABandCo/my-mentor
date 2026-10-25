// Reports (weekly / monthly / 30-day review). Built only from recorded data. Every number carries a "how it is
// calculated" line. Output: a data object for the screen and a printable HTML string for PDF export.
import { attemptsOf, trend } from './comm-lab';
import { goalsOf, paceOf } from './goals';
import { bestStreak, habitStats, habitStreak } from './habit-stats';
import { habitsWithMeta } from './habits';
import { dateKey, lastNDates, streaks } from './metrics';
import { growthOf, timeOf, timeSummary, weekGrowth } from './business';
import type { State } from './store';

export type ReportKind = 'weekly' | 'monthly' | 'thirty';
export const REPORT_DAYS: Record<ReportKind, number> = { weekly: 7, monthly: 30, thirty: 30 };
export const REPORT_TITLE: Record<ReportKind, string> = { weekly: 'Weekly report', monthly: 'Monthly report', thirty: '30-day outcome review' };

export type Report = {
  kind: ReportKind;
  title: string;
  from: string;
  to: string;
  headline: { label: string; value: string; note: string }[];
  habits: { name: string; emoji: string; done: number; eligible: number; pct: number | null; unrecorded: number; streak: number; best: number }[];
  goals: { title: string; progressPct: number; pace: string }[];
  hours: { done: number; partly: number; missed: number; unanswered: number };
  oneThing: { set: number; done: number };
  comm: { attempts: number; avg: number | null; change: number | null };
  business: { content: number; networking: number; referral: number; minutesLogged: number; delegablePct: number | null } | null;
  insights: string[];
  how: string[];
};

export function buildReport(s: State, kind: ReportKind, now = new Date()): Report {
  const today = dateKey(now);
  const days = lastNDates(REPORT_DAYS[kind], now);
  const base = { habitLogs: s.habitLogs };
  const hs = habitsWithMeta(s);

  const habits = hs.map((h) => {
    const st = habitStats(base, h, days, today);
    return { name: h.name, emoji: h.emoji, done: st.done, eligible: st.eligible, pct: st.pct, unrecorded: st.unrecorded, streak: habitStreak(base, h, today), best: bestStreak(base, h, today) };
  });
  const tot = habits.reduce((a, h) => ({ done: a.done + h.done, eligible: a.eligible + h.eligible, unrecorded: a.unrecorded + h.unrecorded }), { done: 0, eligible: 0, unrecorded: 0 });
  const pct = tot.eligible ? Math.round((tot.done / tot.eligible) * 100) : null;

  const hourEntries = Object.entries(s.hours).filter(([k]) => days.includes(k.slice(0, 10)));
  const hours = {
    done: hourEntries.filter(([, v]) => v.status === 'done').length,
    partly: hourEntries.filter(([, v]) => v.status === 'partly').length,
    missed: hourEntries.filter(([, v]) => v.status === 'missed').length,
    unanswered: hourEntries.filter(([, v]) => !v.status).length,
  };
  const ones = Object.entries(s.oneThing).filter(([d]) => days.includes(d));
  const oneThing = { set: ones.length, done: ones.filter(([, o]) => o.done).length };

  const goals = goalsOf(s.collections).filter((g) => g.status === 'active');
  const goalRows = goals.map((g) => {
    const p = paceOf(g, goals, today);
    return { title: g.title, progressPct: Math.round(p.progress * 100), pace: p.pace.replace('_', ' ') };
  });

  const att = attemptsOf(s.collections);
  const inRange = att.filter((a) => days.includes(a.createdAt.slice(0, 10)));
  const tr = trend(att);
  const comm = { attempts: inRange.length, avg: inRange.length ? Math.round(inRange.reduce((a, x) => a + x.percent, 0) / inRange.length) : null, change: tr.change };

  const growth = growthOf(s.collections);
  const wg = weekGrowth(growth.filter((g) => days.includes(g.date)), today);
  const ts = timeSummary(timeOf(s.collections), today, REPORT_DAYS[kind]);
  const business = growth.length || ts.total ? { content: wg.content, networking: wg.networking, referral: wg.referral, minutesLogged: ts.total, delegablePct: ts.total ? Math.round((ts.delegable / ts.total) * 100) : null } : null;
  void wg;

  const st = streaks(s, today);
  const insights: string[] = [];
  const sorted = habits.filter((h) => h.eligible >= 3 && h.pct !== null).sort((a, b) => (b.pct as number) - (a.pct as number));
  if (sorted[0]) insights.push(`Strongest habit: ${sorted[0].name} (${sorted[0].pct}% of ${sorted[0].eligible} answered days).`);
  const weak = sorted[sorted.length - 1];
  if (weak && weak !== sorted[0] && (weak.pct as number) < 60) insights.push(`Needs attention: ${weak.name} (${weak.pct}% of ${weak.eligible} answered days). Consider a smaller version.`);
  if (tot.unrecorded > tot.eligible && tot.eligible > 0) insights.push(`${tot.unrecorded} habit-days have no record. These are unknown, not failures; recording them makes this report more accurate.`);
  if (hours.missed > hours.done && hours.missed + hours.done >= 6) insights.push(`More hours were marked missed (${hours.missed}) than done (${hours.done}). Try planning fewer, larger blocks.`);
  if (oneThing.set >= 3) insights.push(`You completed your One Thing on ${oneThing.done} of ${oneThing.set} days you set one.`);
  if (st.comebacks) insights.push(`${st.comebacks} comeback${st.comebacks > 1 ? 's' : ''} in the last 120 days. Coming back is the skill.`);
  if (!insights.length) insights.push('Not enough records yet for patterns. Keep logging for a week and this section will fill in.');

  return {
    kind,
    title: REPORT_TITLE[kind],
    from: days[0],
    to: days[days.length - 1],
    headline: [
      { label: 'Habit adherence', value: pct === null ? 'Not enough data' : `${pct}%`, note: `${tot.done} done of ${tot.eligible} answered habit-days` },
      { label: 'Active streak', value: `${st.streak} days`, note: 'Days with any honest record; one miss per 7 days is shielded' },
      { label: 'One Thing', value: oneThing.set ? `${oneThing.done}/${oneThing.set}` : 'None set', note: 'Days finished ÷ days set' },
      { label: 'Hour check-ins', value: `${hours.done + hours.partly + hours.missed} answered`, note: `${hours.done} done, ${hours.partly} partly, ${hours.missed} missed` },
    ],
    habits,
    goals: goalRows,
    hours,
    oneThing,
    comm,
    business,
    insights,
    how: [
      'Habit adherence = habit-days marked Done ÷ habit-days you answered (Done + Partial + Missed). Rest days and N/A are excluded. Days with no record are shown separately and are never counted as missed. Only days a habit was scheduled and after it was created are counted.',
      'Active streak = consecutive days with at least one record (habit, hour check-in or One Thing). One missed day in any rolling 7 is absorbed by a streak shield. Today is not counted as missed until it ends.',
      'Hour check-ins count only hours you planned or answered. Unanswered hours are unknown.',
      'Goal progress = average of sub-goals, or current ÷ target for a measurable goal. Pace compares progress with the share of time used; "behind" means progress is more than 15 points behind.',
      'Communication score = sum of five criteria (clarity, structure, tone, confidence, relevance), each 0 to 5, as a percentage. "Basic check" scores use only word counts and fillers. AI scores follow the same rubric.',
      'India time (IST) is used for all days. Nothing here is estimated or invented.',
    ],
  };
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

/** Self-contained printable HTML for expo-print. */
export function reportHtml(r: Report, name: string): string {
  const rows = r.habits.map((h) => `<tr><td>${esc(h.emoji)} ${esc(h.name)}</td><td>${h.done}/${h.eligible}</td><td>${h.pct === null ? 'n/a' : h.pct + '%'}</td><td>${h.unrecorded}</td><td>${h.streak}</td><td>${h.best}</td></tr>`).join('');
  const goals = r.goals.map((g) => `<tr><td>${esc(g.title)}</td><td>${g.progressPct}%</td><td>${esc(g.pace)}</td></tr>`).join('');
  return `<html><head><meta charset="utf-8"><style>
body{font-family:Helvetica,Arial,sans-serif;color:#1F2D26;margin:28px}h1{font-size:22px;margin:0}h2{font-size:15px;margin:22px 0 6px;color:#3F654F}
.sub{color:#6B7A72;font-size:12px}.grid{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.card{border:1px solid #E9E1D0;border-radius:10px;padding:10px 12px;min-width:120px;flex:1}
.v{font-size:20px;font-weight:700}.n{font-size:11px;color:#6B7A72}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border-bottom:1px solid #E9E1D0;padding:5px 4px;text-align:left}
li{font-size:12px;margin:4px 0}.how{font-size:10.5px;color:#6B7A72}</style></head><body>
<h1>${esc(r.title)}</h1><div class="sub">${esc(name || 'My Mentor')} · ${r.from} to ${r.to} · India time</div>
<div class="grid">${r.headline.map((h) => `<div class="card"><div class="n">${esc(h.label)}</div><div class="v">${esc(h.value)}</div><div class="n">${esc(h.note)}</div></div>`).join('')}</div>
<h2>Insights</h2><ul>${r.insights.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
<h2>Habits</h2><table><tr><th>Habit</th><th>Done</th><th>Rate</th><th>No record</th><th>Streak</th><th>Best</th></tr>${rows || '<tr><td colspan=6>No habits yet</td></tr>'}</table>
${goals ? `<h2>Goals</h2><table><tr><th>Goal</th><th>Progress</th><th>Pace</th></tr>${goals}</table>` : ''}
<h2>Communication Lab</h2><div class="n">${r.comm.attempts} attempts in this period${r.comm.avg !== null ? ', average ' + r.comm.avg + '%' : ''}</div>
${r.business ? `<h2>Work & business</h2><div class="n">Content ${r.business.content} · Networking ${r.business.networking} · Referral asks ${r.business.referral} · Time logged ${Math.round(r.business.minutesLogged / 60)} h</div>` : ''}
<h2>How this is calculated</h2><ul class="how">${r.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
<div class="how" style="margin-top:14px">Generated on your phone from your own records. Private to you.</div></body></html>`;
}
