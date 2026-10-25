// Tentative daily billing (₹) against a monthly target (₹10 lakh by default). Rows: journal_entries `bill:DATE`. Pure module.
// "Tentative" on purpose: it is Arpan's own estimate of what he billed or will bill that day, not an accounting record.
import { type Collections } from './collections';

const row = (cols: Collections, id: string) => {
  const r = cols.journal_entries?.[id];
  return r && !r.deletedAt ? r : undefined;
};
export const billedOn = (cols: Collections, date: string): number | null => {
  const a = row(cols, `bill:${date}`)?.amount;
  return typeof a === 'number' && a >= 0 ? a : null;
};
export const billRow = (date: string, amount: number) => ({ id: `bill:${date}`, kind: 'billing', date, amount: Math.max(0, Math.min(1e8, Math.round(amount))) });

export const inr = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1).replace(/\.0$/, '')} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `₹${Math.round(n)}`;
};

/** Month-to-date total, share of target, and what each remaining day (including today if not entered) must bill. */
export function billingPace(cols: Collections, target: number, today: string) {
  const month = today.slice(0, 7);
  let total = 0;
  let days = 0;
  for (const [id, r] of Object.entries(cols.journal_entries ?? {})) {
    if (!id.startsWith(`bill:${month}`) || r.deletedAt || typeof r.amount !== 'number') continue;
    total += r.amount;
    days++;
  }
  const [y, m, d] = today.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const entered = billedOn(cols, today) !== null;
  const daysLeft = Math.max(1, lastDay - d + (entered ? 0 : 1));
  const remaining = Math.max(0, target - total);
  return { total, target, pct: Math.min(100, Math.round((total / target) * 100)), remaining, daysLeft, needPerDay: Math.ceil(remaining / daysLeft), loggedDays: days, today: billedOn(cols, today) };
}
