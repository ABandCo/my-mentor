import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fromDb, liveRows, mergeRows, toCamel, toDb, toSnake, type Row } from '../src/lib/collections.ts';

const row = (id: string, updatedAt: string, extra: Record<string, unknown> = {}): Row => ({ id, createdAt: '2026-10-01T00:00:00Z', updatedAt, ...extra });

test('camel <-> snake conversion round-trips', () => {
  assert.equal(toSnake('neverSendAi'), 'never_send_ai');
  assert.equal(toCamel('never_send_ai'), 'neverSendAi');
  assert.equal(toCamel(toSnake('nextFollowupAt')), 'nextFollowupAt');
});

test('toDb converts top-level keys only and keeps jsonb objects intact', () => {
  const d = toDb({ id: 'a', neverSendAi: true, scores: { clarityScore: 4 }, skipMe: undefined });
  assert.deepEqual(d, { id: 'a', never_send_ai: true, scores: { clarityScore: 4 } });
});

test('fromDb drops user_id and camelCases', () => {
  const r = fromDb({ user_id: 'u', id: 'a', created_at: 'x', never_send_ai: false });
  assert.deepEqual(r, { id: 'a', createdAt: 'x', neverSendAi: false });
});

test('merge: remote-only rows are added', () => {
  const m = mergeRows({}, [row('a', '2026-10-02T00:00:00Z')]);
  assert.deepEqual(Object.keys(m), ['a']);
});

test('merge: newer remote wins, older remote loses', () => {
  const local = { a: row('a', '2026-10-05T00:00:00Z', { text: 'local' }) };
  assert.equal(mergeRows(local, [row('a', '2026-10-06T00:00:00Z', { text: 'remote' })]).a.text, 'remote');
  assert.equal(mergeRows(local, [row('a', '2026-10-04T00:00:00Z', { text: 'remote' })]).a.text, 'local');
});

test('merge: rows with pending uploads are never overwritten', () => {
  const local = { a: row('a', '2026-10-05T00:00:00Z', { text: 'local' }) };
  const m = mergeRows(local, [row('a', '2026-10-09T00:00:00Z', { text: 'remote' })], new Set(['a']));
  assert.equal(m.a.text, 'local');
});

test('merge: a remote deletion (tombstone) propagates when newer', () => {
  const local = { a: row('a', '2026-10-05T00:00:00Z') };
  const m = mergeRows(local, [row('a', '2026-10-07T00:00:00Z', { deletedAt: '2026-10-07T00:00:00Z' })]);
  assert.ok(m.a.deletedAt);
});

test('liveRows hides deleted rows and sorts newest first', () => {
  const cols = {
    mentor_memory: {
      a: row('a', 'x', { createdAt: '2026-10-01' }),
      b: row('b', 'x', { createdAt: '2026-10-03' }),
      c: row('c', 'x', { createdAt: '2026-10-02', deletedAt: '2026-10-04' }),
    },
  };
  assert.deepEqual(liveRows(cols, 'mentor_memory').map((r) => r.id), ['b', 'a']);
  assert.deepEqual(liveRows(cols, 'goals'), []);
});
