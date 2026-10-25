// A small people list for networking: who to keep in touch with, how often, and who is due. Rows: journal_entries `person:<id>`.
// Pure module. Names stay on the phone and in the user's own synced rows; they are masked like any other name before reaching the AI.
import { type Collections, liveRows } from './collections';

export type Person = { id: string; name: string; everyDays: number; lastContact?: string; note?: string };
export const FREQUENCIES = [7, 14, 30] as const;

export const peopleOf = (cols: Collections): Person[] =>
  liveRows(cols, 'journal_entries', 'createdAt')
    .filter((r) => r.kind === 'person' && typeof r.name === 'string')
    .map((r) => ({ id: r.id, name: String(r.name), everyDays: typeof r.everyDays === 'number' ? r.everyDays : 14, lastContact: typeof r.lastContact === 'string' ? r.lastContact : undefined, note: typeof r.note === 'string' ? r.note : undefined }));
export const personRow = (id: string, name: string, everyDays: number) => ({ id: `person:${id}`, kind: 'person', name: name.trim().slice(0, 40), everyDays });

const day = (d: string) => Math.floor(new Date(`${d}T12:00:00Z`).getTime() / 86400000);
/** Days since last contact; people never contacted count from when they were added (never "overdue" on day one). */
export function dueContacts(people: Person[], today: string): { person: Person; daysSince: number | null; overdueBy: number }[] {
  return people
    .map((p) => {
      const since = p.lastContact ? day(today) - day(p.lastContact) : null;
      return { person: p, daysSince: since, overdueBy: since === null ? 0 : since - p.everyDays };
    })
    .filter((x) => x.daysSince === null || x.overdueBy >= 0)
    .sort((a, b) => (b.daysSince ?? 999) - (a.daysSince ?? 999));
}
