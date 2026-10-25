// Two-way Google Calendar sync for planner items. Pure planning (planSync) + a thin REST runner (runSync) with an injected
// fetch and access token, so the logic is unit-tested without Google. Scope used: calendar.events (read/write events).
// Conflict rule: the side with the newer timestamp wins. Remote cancellation deletes locally; local deletion deletes remotely.
export const CAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export type LocalItem = { id: string; title: string; date: string; time?: string; durationMin?: number; done?: boolean; gcalId?: string; /** ISO time of the last successful sync of this item. */ syncedAt?: string; updatedAt: string; deletedAt?: string | null; source?: string };
export type RemoteEvent = { id: string; status?: string; summary?: string; updated: string; start?: { date?: string; dateTime?: string }; end?: { dateTime?: string }; extendedProperties?: { private?: { mymentorId?: string } } };

/** IST wall clock for an ISO instant. */
const istParts = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 330 * 60000).toISOString();
  return { date: d.slice(0, 10), time: d.slice(11, 16) };
};
const addMin = (date: string, time: string, min: number) => new Date(new Date(`${date}T${time}:00+05:30`).getTime() + min * 60000).toISOString();

/** App item -> Google event body (timed block, or an all-day event when it has no time). */
export function toEvent(i: LocalItem) {
  const base = { summary: i.title, extendedProperties: { private: { mymentorId: i.id } } };
  if (!i.time) {
    const next = new Date(new Date(`${i.date}T12:00:00+05:30`).getTime() + 86400000).toISOString().slice(0, 10);
    return { ...base, start: { date: i.date }, end: { date: next } };
  }
  const dur = i.durationMin ?? 30;
  return { ...base, start: { dateTime: `${i.date}T${i.time}:00+05:30`, timeZone: 'Asia/Kolkata' }, end: { dateTime: addMin(i.date, i.time, dur), timeZone: 'Asia/Kolkata' } };
}
/** Google event -> fields to merge into an app item. */
export function fromEvent(e: RemoteEvent): Pick<LocalItem, 'title' | 'date' | 'time' | 'durationMin'> & { gcalId: string } {
  if (e.start?.dateTime) {
    const s = istParts(e.start.dateTime);
    const dur = e.end?.dateTime ? Math.max(5, Math.round((new Date(e.end.dateTime).getTime() - new Date(e.start.dateTime).getTime()) / 60000)) : 30;
    return { title: e.summary ?? '(no title)', date: s.date, time: s.time, durationMin: dur, gcalId: e.id };
  }
  return { title: e.summary ?? '(no title)', date: e.start?.date ?? '', time: undefined, durationMin: undefined, gcalId: e.id };
}

export type SyncPlan = {
  insertRemote: LocalItem[];
  patchRemote: LocalItem[];
  deleteRemote: string[]; // google event ids
  upsertLocal: (Partial<LocalItem> & { id: string; gcalId: string })[];
  deleteLocal: string[]; // local ids
};

/** Decide what to do, given local items and the remote events in the same date window. */
export function planSync(local: LocalItem[], remote: RemoteEvent[], window: { from: string; to: string }): SyncPlan {
  const plan: SyncPlan = { insertRemote: [], patchRemote: [], deleteRemote: [], upsertLocal: [], deleteLocal: [] };
  const inWin = (d: string) => d >= window.from && d <= window.to;
  const remoteById = new Map(remote.map((e) => [e.id, e]));
  const localByGcal = new Map(local.filter((l) => l.gcalId).map((l) => [l.gcalId!, l]));

  for (const l of local) {
    if (l.deletedAt) {
      if (l.gcalId && remoteById.get(l.gcalId)?.status !== 'cancelled') plan.deleteRemote.push(l.gcalId);
      continue;
    }
    if (!inWin(l.date)) continue;
    if (l.source === 'google' && !l.gcalId) continue;
    if (!l.gcalId) {
      plan.insertRemote.push(l);
      continue;
    }
    const r = remoteById.get(l.gcalId);
    if (!r) continue; // outside the fetched window or removed: leave it, never guess
    if (r.status === 'cancelled') {
      plan.deleteLocal.push(l.id);
      continue;
    }
    const lt = new Date(l.updatedAt).getTime();
    const rt = new Date(r.updated).getTime();
    const st = l.syncedAt ? new Date(l.syncedAt).getTime() : null;
    // After a sync, only edits made after it count as changes (writing syncedAt itself must not look like an edit).
    const localChanged = st === null ? lt > rt + 1000 : lt > st + 2000;
    const remoteChanged = st === null ? rt > lt + 1000 : rt > st + 2000;
    if (localChanged && (!remoteChanged || lt >= rt)) plan.patchRemote.push(l);
    else if (remoteChanged) plan.upsertLocal.push({ id: l.id, ...fromEvent(r) });
  }
  for (const r of remote) {
    if (r.status === 'cancelled' || localByGcal.has(r.id)) continue;
    const own = r.extendedProperties?.private?.mymentorId;
    if (own && local.some((l) => l.id === own)) continue; // an event we created whose gcalId was not saved yet
    const f = fromEvent(r);
    if (inWin(f.date)) plan.upsertLocal.push({ id: `gcal:${r.id}`, source: 'google', ...f });
  }
  return plan;
}

export type Fetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export async function runSync(local: LocalItem[], token: string, window: { from: string; to: string }, f: Fetch) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const q = new URLSearchParams({ timeMin: `${window.from}T00:00:00+05:30`, timeMax: `${window.to}T23:59:59+05:30`, singleEvents: 'true', showDeleted: 'true', maxResults: '250' });
  const res = await f(`${API}?${q}`, { headers });
  if (!res.ok) throw new Error(res.status === 401 ? 'calendar_auth' : `calendar_http_${res.status}`);
  const remote = ((await res.json()) as { items?: RemoteEvent[] }).items ?? [];
  const plan = planSync(local, remote, window);
  const created: { id: string; gcalId: string }[] = [];
  for (const l of plan.insertRemote) {
    const r = await f(API, { method: 'POST', headers, body: JSON.stringify(toEvent(l)) });
    if (r.ok) created.push({ id: l.id, gcalId: ((await r.json()) as { id: string }).id });
  }
  for (const l of plan.patchRemote) await f(`${API}/${encodeURIComponent(l.gcalId!)}`, { method: 'PATCH', headers, body: JSON.stringify(toEvent(l)) });
  for (const id of plan.deleteRemote) await f(`${API}/${encodeURIComponent(id)}`, { method: 'DELETE', headers });
  return { plan, created };
}
