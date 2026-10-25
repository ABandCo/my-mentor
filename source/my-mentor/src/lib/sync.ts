// Offline-first sync. Every local change becomes an Op in a persisted outbox; the outbox is flushed
// to Supabase in order whenever we are signed in and online. Failed ops stay queued and retry.
import { ACTIVE_COLLECTIONS, Collections, fromDb, isActive, mergeRows, toDb } from './collections';
import type { Action, Profile, State } from './store';
import { supabase } from './supabase';

export type Op =
  | { table: string; kind: 'upsert'; row: Record<string, unknown>; onConflict: string }
  | { table: string; kind: 'delete'; match: Record<string, unknown> };

const now = () => new Date().toISOString();

function profileRow(p: Profile, name: string, xp: number) {
  return {
    display_name: name,
    language: p.language,
    coaching_style: p.coachingStyle,
    focus_areas: p.focusAreas,
    wake_time: p.wake,
    sleep_time: p.sleep,
    intensive_start: p.intensiveStart,
    intensive_end: p.intensiveEnd,
    quiet_start: p.quietStart,
    quiet_end: p.quietEnd,
    ai_consent_general: p.aiConsentGeneral,
    ai_consent_sensitive: p.aiConsentSensitive,
    baselines: p.baselines,
    onboarded_at: p.onboardedAt ?? null,
    xp,
    updated_at: now(),
  };
}

function dayPlanRow(s: State, day: string) {
  const one = s.oneThing[day];
  return { day, one_thing: one?.text ?? null, one_thing_done: !!one?.done, mood: s.mood[day] ?? null, updated_at: now() };
}

/** Map a reducer action (and the resulting state) to the database writes it implies. */
export function opsFor(a: Action, next: State): Op[] {
  const xpOp = (): Op => ({ table: 'profiles', kind: 'upsert', row: { xp: next.xp, updated_at: now() }, onConflict: 'user_id' });
  switch (a.type) {
    case 'setName':
    case 'setProfile':
      return [{ table: 'profiles', kind: 'upsert', row: profileRow(next.profile, next.name, next.xp), onConflict: 'user_id' }];
    case 'setOneThing':
    case 'setMood':
      return [{ table: 'day_plans', kind: 'upsert', row: dayPlanRow(next, a.date), onConflict: 'user_id,day' }];
    case 'toggleOneThing':
      return [{ table: 'day_plans', kind: 'upsert', row: dayPlanRow(next, a.date), onConflict: 'user_id,day' }, xpOp()];
    case 'setHourPlan':
    case 'setHourStatus': {
      const [day, hh] = a.key.split(':');
      const h = next.hours[a.key];
      return [
        {
          table: 'hour_checkins',
          kind: 'upsert',
          row: { day, hour: Number(hh), plan: h.plan, status: h.status ?? null, answered_at: h.status ? now() : null, updated_at: now() },
          onConflict: 'user_id,day,hour',
        },
        ...(a.type === 'setHourStatus' ? [xpOp()] : []),
      ];
    }
    case 'addHabit':
      return [
        {
          table: 'habits',
          kind: 'upsert',
          row: { id: a.habit.id, name: a.habit.name, emoji: a.habit.emoji, target: a.habit.target ?? null, created_at: a.habit.createdAt, updated_at: now() },
          onConflict: 'user_id,id',
        },
      ];
    case 'logHabit':
      return [
        a.status
          ? { table: 'habit_logs', kind: 'upsert', row: { habit_id: a.habitId, day: a.date, status: a.status, updated_at: now() }, onConflict: 'user_id,habit_id,day' }
          : { table: 'habit_logs', kind: 'delete', match: { habit_id: a.habitId, day: a.date } },
        xpOp(),
      ];
    case 'addCommitment':
      return [{ table: 'commitments', kind: 'upsert', row: { id: a.c.id, text: a.c.text, due: a.c.due ?? null, done: a.c.done, created_at: a.c.createdAt, updated_at: now() }, onConflict: 'user_id,id' }];
    case 'toggleCommitment': {
      const c = next.commitments.find((x) => x.id === a.id);
      return c ? [{ table: 'commitments', kind: 'upsert', row: { id: c.id, text: c.text, done: c.done, updated_at: now() }, onConflict: 'user_id,id' }] : [];
    }
    case 'col/put':
    case 'col/del': {
      if (!isActive(a.table)) return [];
      const r = next.collections[a.table]?.[a.type === 'col/put' ? a.row.id : a.id];
      return r ? [{ table: a.table, kind: 'upsert', row: toDb(r, a.table), onConflict: 'user_id,id' }] : [];
    }
    default:
      return [];
  }
}

/** Flush ops in order. Returns the ops that could not be sent (to keep in the outbox). */
export async function flush(outbox: Op[], userId: string): Promise<{ remaining: Op[]; error?: string }> {
  if (!supabase) return { remaining: outbox };
  for (let i = 0; i < outbox.length; i++) {
    const op = outbox[i];
    const res =
      op.kind === 'upsert'
        ? await supabase.from(op.table).upsert({ ...op.row, user_id: userId }, { onConflict: op.onConflict })
        : await supabase.from(op.table).delete().match({ ...op.match, user_id: userId });
    if (res.error) return { remaining: outbox.slice(i), error: res.error.message };
  }
  return { remaining: [] };
}

/** Pull everything for this user and merge with local. Local entries win where both exist (they are newer or unsynced). */
export async function pull(local: State): Promise<Partial<State> | { error: string }> {
  if (!supabase) return { error: 'cloud disabled' };
  const [p, h, hl, dp, hc, c] = await Promise.all([
    supabase.from('profiles').select('*').maybeSingle(),
    supabase.from('habits').select('*').eq('archived', false),
    supabase.from('habit_logs').select('*'),
    supabase.from('day_plans').select('*'),
    supabase.from('hour_checkins').select('*'),
    supabase.from('commitments').select('*'),
  ]);
  const err = [p, h, hl, dp, hc, c].find((r) => r.error)?.error;
  if (err) return { error: err.message };

  const out: Partial<State> = {};

  // Generic collections: one select per active table, merged by updatedAt (rows still queued locally are protected).
  const colResults = await Promise.all(ACTIVE_COLLECTIONS.map((t) => supabase!.from(t).select('*')));
  const colErr = colResults.find((r) => r.error)?.error;
  if (colErr) return { error: colErr.message };
  const merged: Collections = { ...local.collections };
  ACTIVE_COLLECTIONS.forEach((t, i) => {
    const pending = new Set(local.outbox.filter((o) => o.table === t && o.kind === 'upsert').map((o) => String((o as { row: { id?: string } }).row.id)));
    merged[t] = mergeRows(local.collections[t] ?? {}, (colResults[i].data ?? []).map((r) => fromDb(r as Record<string, unknown>, t)), pending);
  });
  out.collections = merged;
  const prof = p.data;
  if (prof) {
    out.name = local.name || prof.display_name;
    out.xp = Math.max(local.xp, prof.xp ?? 0);
    out.profile = local.profile.onboardedAt
      ? local.profile
      : {
          language: prof.language,
          coachingStyle: prof.coaching_style,
          focusAreas: prof.focus_areas,
          wake: prof.wake_time.slice(0, 5),
          sleep: prof.sleep_time.slice(0, 5),
          intensiveStart: prof.intensive_start.slice(0, 5),
          intensiveEnd: prof.intensive_end.slice(0, 5),
          quietStart: prof.quiet_start.slice(0, 5),
          quietEnd: prof.quiet_end.slice(0, 5),
          aiConsentGeneral: prof.ai_consent_general,
          aiConsentSensitive: prof.ai_consent_sensitive,
          baselines: prof.baselines ?? {},
          onboardedAt: prof.onboarded_at ?? undefined,
        };
  }

  const localHabitIds = new Set(local.habits.map((x) => x.id));
  out.habits = [
    ...local.habits,
    ...(h.data ?? [])
      .filter((r) => !localHabitIds.has(r.id))
      .map((r) => ({ id: r.id, name: r.name, emoji: r.emoji, target: r.target ?? undefined, createdAt: r.created_at })),
  ];

  const logs: State['habitLogs'] = {};
  for (const r of hl.data ?? []) (logs[r.day] ??= {})[r.habit_id] = r.status;
  for (const [d, m] of Object.entries(local.habitLogs)) logs[d] = { ...(logs[d] ?? {}), ...m };
  out.habitLogs = logs;

  const one: State['oneThing'] = {};
  const mood: State['mood'] = {};
  for (const r of dp.data ?? []) {
    if (r.one_thing) one[r.day] = { text: r.one_thing, done: r.one_thing_done };
    if (r.mood) mood[r.day] = r.mood;
  }
  out.oneThing = { ...one, ...local.oneThing };
  out.mood = { ...mood, ...local.mood };

  const hours: State['hours'] = {};
  for (const r of hc.data ?? []) hours[`${r.day}:${String(r.hour).padStart(2, '0')}`] = { plan: r.plan, status: r.status ?? undefined };
  out.hours = { ...hours, ...local.hours };

  const localC = new Set(local.commitments.map((x) => x.id));
  out.commitments = [
    ...local.commitments,
    ...(c.data ?? []).filter((r) => !localC.has(r.id)).map((r) => ({ id: r.id, text: r.text, due: r.due ?? undefined, done: r.done, createdAt: r.created_at })),
  ];
  return out;
}

/** Push the whole local state once (used right after first sign-in on a device that already has data). */
export function snapshotOps(s: State): Op[] {
  const ops: Op[] = [{ table: 'profiles', kind: 'upsert', row: profileRow(s.profile, s.name, s.xp), onConflict: 'user_id' }];
  for (const h of s.habits) ops.push(...opsFor({ type: 'addHabit', habit: h }, s));
  for (const [d, m] of Object.entries(s.habitLogs))
    for (const [hid, st] of Object.entries(m))
      ops.push({ table: 'habit_logs', kind: 'upsert', row: { habit_id: hid, day: d, status: st, updated_at: now() }, onConflict: 'user_id,habit_id,day' });
  const days = new Set([...Object.keys(s.oneThing), ...Object.keys(s.mood)]);
  for (const d of days) ops.push({ table: 'day_plans', kind: 'upsert', row: dayPlanRow(s, d), onConflict: 'user_id,day' });
  for (const k of Object.keys(s.hours)) ops.push(...opsFor({ type: 'setHourPlan', key: k, plan: s.hours[k].plan }, s));
  for (const c of s.commitments) ops.push(...opsFor({ type: 'addCommitment', c }, s));
  for (const t of ACTIVE_COLLECTIONS) for (const r of Object.values(s.collections[t] ?? {})) ops.push({ table: t, kind: 'upsert', row: toDb(r, t), onConflict: 'user_id,id' });
  return ops;
}
