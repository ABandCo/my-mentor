// Work & Business (no CRM: no leads, pipeline or fee ledger). This module covers the practice-growth routine:
//  - weekly growth actions (content, networking, referral asks) with targets,
//  - time use across your two ventures plus a delegation advisor based on YOUR logged minutes,
//  - a compliance calendar with typical due dates (the user verifies each year; extensions are common).
// Pure module, unit-tested.
import { liveRows, type Collections, type Row } from './collections';
import { lastNDates } from './metrics';

export const VENTURES = ['Arpan Bohra & Co.', 'ComplianceKart'] as const;

// ---------- growth log ----------
export type GrowthKind = 'content' | 'networking' | 'referral' | 'win' | 'insight';
export const GROWTH_KINDS: { key: GrowthKind; label: string; emoji: string; prompt: string }[] = [
  { key: 'content', label: 'Content', emoji: '✍️', prompt: 'What did you publish or prepare (post, article, reel, newsletter)?' },
  { key: 'networking', label: 'Networking', emoji: '🤝', prompt: 'Who did you meet or reconnect with, and what next?' },
  { key: 'referral', label: 'Referral ask', emoji: '🔁', prompt: 'Who did you ask for a referral or introduction?' },
  { key: 'win', label: 'Win', emoji: '🏆', prompt: 'What went well in the business today?' },
  { key: 'insight', label: 'Insight', emoji: '💡', prompt: 'What did you learn about your practice or clients?' },
];
export type GrowthEntry = Row & { kind: GrowthKind; text: string; venture: string; date: string };
export const TARGET_DEFAULTS = { content: 2, networking: 3, referral: 1 };
export type Targets = typeof TARGET_DEFAULTS;

export const growthOf = (cols: Collections) => liveRows<GrowthEntry>(cols, 'biz_log', 'date').filter((r) => r.kind !== ('targets' as string));
export const targetsOf = (cols: Collections): Targets => {
  const r = cols.biz_log?.targets;
  return r && !r.deletedAt ? { ...TARGET_DEFAULTS, ...(r as unknown as Partial<Targets>) } : TARGET_DEFAULTS;
};

export function weekGrowth(entries: GrowthEntry[], today: string) {
  const days = new Set(lastNDates(7, new Date(`${today}T12:00:00+05:30`)));
  const inWeek = entries.filter((e) => days.has(e.date));
  const n = (k: GrowthKind) => inWeek.filter((e) => e.kind === k).length;
  return { content: n('content'), networking: n('networking'), referral: n('referral'), wins: n('win'), insights: n('insight') };
}

// ---------- time use & delegation advisor ----------
export const TIME_CATEGORIES = [
  { key: 'client', label: 'Client work', delegable: false },
  { key: 'review', label: 'Review & sign-off', delegable: false },
  { key: 'bd', label: 'Business development', delegable: false },
  { key: 'admin', label: 'Admin & data entry', delegable: true },
  { key: 'filing', label: 'Routine filings & uploads', delegable: true },
  { key: 'followup', label: 'Document chasing & follow-up calls', delegable: true },
  { key: 'learning', label: 'Learning', delegable: false },
  { key: 'other', label: 'Other', delegable: false },
] as const;
export type TimeEntry = Row & { category: string; minutes: number; venture: string; date: string; note?: string };
export const timeOf = (cols: Collections) => liveRows<TimeEntry>(cols, 'time_logs', 'date');

export function timeSummary(entries: TimeEntry[], today: string, days = 14) {
  const set = new Set(lastNDates(days, new Date(`${today}T12:00:00+05:30`)));
  const inRange = entries.filter((e) => set.has(e.date));
  const total = inRange.reduce((a, e) => a + e.minutes, 0);
  const by = TIME_CATEGORIES.map((c) => ({ key: c.key, label: c.label, delegable: c.delegable, minutes: inRange.filter((e) => e.category === c.key).reduce((a, e) => a + e.minutes, 0) }));
  const byVenture = VENTURES.map((v) => ({ venture: v, minutes: inRange.filter((e) => e.venture === v).reduce((a, e) => a + e.minutes, 0) }));
  const delegable = by.filter((c) => c.delegable).reduce((a, c) => a + c.minutes, 0);
  const bd = by.find((c) => c.key === 'bd')?.minutes ?? 0;
  return { total, by, byVenture, delegable, bd, days, loggedDays: new Set(inRange.map((e) => e.date)).size };
}

/** Advice built only from the user's own minutes. Needs at least 3 logged days so one busy day is not mistaken for a pattern. */
export function delegationAdvice(sum: ReturnType<typeof timeSummary>): string[] {
  if (sum.loggedDays < 3 || sum.total === 0) return ['Log your time for at least 3 days to get delegation advice. Even rough minutes are fine.'];
  const out: string[] = [];
  const perWeek = (m: number) => Math.round(((m / sum.days) * 7 / 60) * 10) / 10;
  const dShare = Math.round((sum.delegable / sum.total) * 100);
  if (sum.delegable > 0)
    out.push(`${dShare}% of logged time (${perWeek(sum.delegable)} h/week) went into admin, filing and chasing. Handing over even half could free about ${perWeek(sum.delegable / 2)} h/week.`);
  const bdShare = Math.round((sum.bd / sum.total) * 100);
  if (bdShare < 10) out.push(`Business development is ${bdShare}% of logged time. Aim to move some freed hours there: follow-ups, content, networking.`);
  const top = [...sum.by].sort((a, b) => b.minutes - a.minutes)[0];
  if (top && top.minutes > 0) out.push(`Biggest block: ${top.label} (${Math.round((top.minutes / sum.total) * 100)}%).`);
  if (!out.length) out.push('No delegable work logged. Good: keep tagging routine tasks so patterns show up.');
  return out;
}

// ---------- compliance calendar ----------
// Typical statutory dates. They are DEFAULTS the user can switch off; extensions and state-wise variations are common,
// so the app always labels them "typical" and tells the user to verify on the official portal.
export type Template = {
  id: string;
  name: string;
  group: 'GST' | 'TDS/TCS' | 'Income tax' | 'Payroll' | 'Companies Act';
  freq: 'monthly' | 'quarterly' | 'annual';
  /** monthly: day of month. annual/quarterly: list of [month 1-12, day]. */
  day?: number;
  dates?: [number, number][];
  note: string;
};
export const TEMPLATES: Template[] = [
  { id: 'gstr1', name: 'GSTR-1 (outward supplies)', group: 'GST', freq: 'monthly', day: 11, note: 'Monthly filers. QRMP filers follow the quarterly schedule.' },
  { id: 'gstr3b', name: 'GSTR-3B (summary return and tax)', group: 'GST', freq: 'monthly', day: 20, note: 'Typically the 20th; QRMP filers 22nd/24th by state.' },
  { id: 'gstr9', name: 'GSTR-9 / 9C (annual return)', group: 'GST', freq: 'annual', dates: [[12, 31]], note: 'For the previous financial year.' },
  { id: 'tds-pay', name: 'TDS payment', group: 'TDS/TCS', freq: 'monthly', day: 7, note: 'For deductions in the previous month (March: 30 April).' },
  { id: 'tds-ret', name: 'TDS return (24Q/26Q/27Q)', group: 'TDS/TCS', freq: 'quarterly', dates: [[7, 31], [10, 31], [1, 31], [5, 31]], note: 'Quarters ending Jun, Sep, Dec, Mar.' },
  { id: 'adv-tax', name: 'Advance tax instalment', group: 'Income tax', freq: 'quarterly', dates: [[6, 15], [9, 15], [12, 15], [3, 15]], note: 'Cumulative 15%, 45%, 75%, 100%.' },
  { id: 'itr', name: 'Income tax return (non-audit)', group: 'Income tax', freq: 'annual', dates: [[7, 31]], note: 'Individuals and others not requiring audit. Extensions are often notified.' },
  { id: 'tax-audit', name: 'Tax audit report (3CD)', group: 'Income tax', freq: 'annual', dates: [[9, 30]], note: 'For audit cases.' },
  { id: 'itr-audit', name: 'Income tax return (audit cases)', group: 'Income tax', freq: 'annual', dates: [[10, 31]], note: 'Check the notified date each year.' },
  { id: 'pf', name: 'PF/ESI payment and return', group: 'Payroll', freq: 'monthly', day: 15, note: 'For the previous month.' },
  { id: 'aoc4', name: 'ROC: AOC-4 (financial statements)', group: 'Companies Act', freq: 'annual', dates: [[10, 30]], note: 'Within 30 days of the AGM; 30 Oct assumes a 30 Sep AGM.' },
  { id: 'mgt7', name: 'ROC: MGT-7 (annual return)', group: 'Companies Act', freq: 'annual', dates: [[11, 29]], note: 'Within 60 days of the AGM; 29 Nov assumes a 30 Sep AGM.' },
];

export type Occurrence = { key: string; tpl: Template; due: string; period: string; done: boolean; daysLeft: number };

const pad = (n: number) => String(n).padStart(2, '0');
const msDay = 86400000;
const stamp = (d: string) => new Date(`${d}T12:00:00+05:30`).getTime();

/** Occurrences due within [today - lookBack, today + horizon]. `done` / `off` come from compliance_items rows. */
export function dueList(today: string, cols: Collections, horizon = 45, lookBack = 10): Occurrence[] {
  const rows = new Map(liveRows(cols, 'compliance_items').map((r) => [r.id, r as Row & { done?: boolean; off?: boolean }]));
  const [y, m] = today.split('-').map(Number);
  const out: Occurrence[] = [];
  for (const tpl of TEMPLATES) {
    if (rows.get(`off:${tpl.id}`)?.off) continue;
    const dates: string[] = [];
    for (const yy of [y - 1, y, y + 1]) {
      if (tpl.freq === 'monthly') for (let mm = 1; mm <= 12; mm++) dates.push(`${yy}-${pad(mm)}-${pad(Math.min(tpl.day ?? 1, 28 + (mm !== 2 ? 2 : 0)))}`);
      else for (const [mm, dd] of tpl.dates ?? []) dates.push(`${yy}-${pad(mm)}-${pad(dd)}`);
    }
    for (const due of dates) {
      const left = Math.round((stamp(due) - stamp(today)) / msDay);
      if (left < -lookBack || left > horizon) continue;
      const key = `${tpl.id}:${due}`;
      out.push({ key, tpl, due, period: due.slice(0, 7), done: !!rows.get(key)?.done, daysLeft: left });
    }
  }
  void m;
  return out.sort((a, b) => a.due.localeCompare(b.due) || a.tpl.name.localeCompare(b.tpl.name));
}

// ---------- weekly action plan (rules-based, always available) ----------
export function weeklyActions(today: string, cols: Collections): string[] {
  const g = weekGrowth(growthOf(cols), today);
  const t = targetsOf(cols);
  const out: string[] = [];
  const due = dueList(today, cols, 7, 0).filter((o) => !o.done);
  if (due.length) out.push(`Compliance first: ${due.slice(0, 3).map((o) => `${o.tpl.name} (${o.due.slice(5)})`).join(', ')}.`);
  if (g.referral < t.referral) out.push(`Ask ${t.referral - g.referral} more client or contact for a referral or introduction this week.`);
  if (g.networking < t.networking) out.push(`Reconnect with ${t.networking - g.networking} more person${t.networking - g.networking > 1 ? 's' : ''} (past client, peer, or bank/ lawyer contact).`);
  if (g.content < t.content) out.push(`Publish ${t.content - g.content} more useful post or note on a compliance change clients ask about.`);
  if (!out.length) out.push('Targets met this week. Pick one client relationship to strengthen and one process to simplify.');
  return out;
}
