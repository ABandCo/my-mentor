// Generic offline-first collections. A "collection" is a Supabase table whose primary key is (user_id, id).
// Rows live in local state keyed by id; every change becomes an outbox op (see sync.ts); pulls merge by updatedAt.
// Pure module (no React / device imports) so it can be unit-tested in Node.

export type CollectionName =
  | 'mentor_memory'
  | 'mentor_sessions'
  | 'goals'
  | 'habit_meta'
  | 'planner_items'
  | 'comm_attempts'
  | 'time_logs'
  | 'biz_log'
  | 'compliance_items'
  | 'xp_events'
  | 'badges'
  | 'journal_entries';

export const COLLECTION_NAMES: CollectionName[] = [
  'mentor_memory',
  'mentor_sessions',
  'goals',
  'habit_meta',
  'planner_items',
  'comm_attempts',
  'time_logs',
  'biz_log',
  'compliance_items',
  'xp_events',
  'badges',
  'journal_entries',
];

/**
 * Tables that exist in the database right now. A collection is only synced once its migration is applied,
 * so an unfinished feature can never block syncing of everything else. Update this list with each migration.
 */
export const ACTIVE_COLLECTIONS: CollectionName[] = [...COLLECTION_NAMES];

/** Tables with typed columns (0002). Every other collection is a "document" table: id, data jsonb, timestamps. */
export const TYPED_COLLECTIONS: CollectionName[] = ['mentor_memory', 'mentor_sessions'];
const ENVELOPE = new Set(['id', 'createdAt', 'updatedAt', 'deletedAt']);
export const isActive = (t: CollectionName) => ACTIVE_COLLECTIONS.includes(t);

export type Row = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  [key: string]: unknown;
};
export type Collections = Partial<Record<CollectionName, Record<string, Row>>>;

export const nowIso = () => new Date().toISOString();

export const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
export const toCamel = (k: string) => k.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());

/** App row (camelCase) -> database row (snake_case). Nested objects (jsonb) are passed through untouched. */
export function toDb(row: Record<string, unknown>, table?: CollectionName): Record<string, unknown> {
  if (table && !TYPED_COLLECTIONS.includes(table)) {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) if (!ENVELOPE.has(k) && v !== undefined) data[k] = v;
    return { id: row.id, data, deleted_at: row.deletedAt ?? null, created_at: row.createdAt, updated_at: row.updatedAt };
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (v !== undefined) out[toSnake(k)] = v;
  return out;
}

/** Database row -> app row. user_id is dropped (it is implied by the signed-in account). */
export function fromDb(row: Record<string, unknown>, table?: CollectionName): Row {
  if (table && !TYPED_COLLECTIONS.includes(table)) {
    return { ...((row.data as Record<string, unknown>) ?? {}), id: row.id, createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at ?? null } as Row;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (k !== 'user_id') out[toCamel(k)] = v;
  return out as Row;
}

/** Last write wins per row. Rows the phone still has queued to upload are protected by the caller via `pendingIds`. */
export function mergeRows(local: Record<string, Row>, remote: Row[], pendingIds: Set<string> = new Set()): Record<string, Row> {
  const out = { ...local };
  for (const r of remote) {
    const mine = out[r.id];
    if (!mine) out[r.id] = r;
    else if (pendingIds.has(r.id)) continue;
    else if ((r.updatedAt ?? '') > (mine.updatedAt ?? '')) out[r.id] = r;
  }
  return out;
}

/** Live (not deleted) rows of a collection, newest first. */
export function liveRows<T extends Row = Row>(cols: Collections, name: CollectionName, sortKey: keyof Row | string = 'createdAt'): T[] {
  const rows = Object.values(cols[name] ?? {}).filter((r) => !r.deletedAt) as T[];
  return rows.sort((a, b) => String(b[sortKey as string] ?? '').localeCompare(String(a[sortKey as string] ?? '')));
}
