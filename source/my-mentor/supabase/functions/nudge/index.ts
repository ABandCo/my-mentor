// "nudge" Edge Function: called every 15 minutes by pg_cron (see migration 0004). For each phone registered in push_devices
// it decides, from the person's own settings, whether a nudge or a fixed prompt is due, and sends it through Expo push.
// Safety: only people who chose a role AND turned nudges on get anything; 6 AM–11 PM IST only; the gap doubles when earlier
// nudges were ignored; a daily cap applies; nothing is sent to someone who opened the app in the last 10 minutes.
// No content is logged. The cron secret is read from Vault by the function itself (never in the request body).
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { fixedNotifications, nudgeGap, pickNudge, type NudgeLang } from './nudges.ts';

declare const Deno: {
  env: { get(k: string): string | undefined };
  serve(h: (r: Request) => Response | Promise<Response>): void;
};

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
const DAILY_CAP = 14;
const EXPO = 'https://exp.host/--/api/v2/push/send';

type Device = { user_id: string; token: string; last_open_at: string; last_sent_at: string | null; sent_since_open: number };
type Row = { user_id: string; id: string; data: Record<string, unknown>; deleted_at: string | null };
type Msg = { to: string; title: string; body: string; data: Record<string, string>; channelId: string; sound: string; priority: string };

const istParts = (d: Date) => {
  const t = new Date(d.getTime() + 330 * 60000);
  const iso = t.toISOString();
  return { day: iso.slice(0, 10), hour: t.getUTCHours(), minute: t.getUTCMinutes(), weekday: t.getUTCDay() };
};
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, code: 'bad_request' }, 405);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const { data: secret } = await admin.rpc('get_nudge_secret');
  const given = req.headers.get('x-cron-secret') ?? '';
  if (typeof secret !== 'string' || !secret || !safeEqual(given, secret)) return json({ ok: false, code: 'unauthorized' }, 401);

  const now = new Date();
  const { day, hour, minute, weekday } = istParts(now);
  if (hour < 6 || hour >= 23) return json({ ok: true, sent: 0, reason: 'outside_hours' });
  const nowMin = hour * 60 + minute;

  const { data: devs } = await admin.from('push_devices').select('user_id, token, last_open_at, last_sent_at, sent_since_open');
  const devices = (devs ?? []) as Device[];
  if (!devices.length) return json({ ok: true, sent: 0, reason: 'no_devices' });
  const users = [...new Set(devices.map((d) => d.user_id))];

  // Personalisation inputs (the person's own synced rows).
  const month = day.slice(0, 7);
  const { data: jr } = await admin
    .from('journal_entries')
    .select('user_id, id, data, deleted_at')
    .in('user_id', users)
    .or(`id.eq.cfg:disc,id.eq.water:${day},id.like.person:*,id.like.bill:${month}*`)
    .is('deleted_at', null);
  const journal = (jr ?? []) as Row[];
  const { data: pr } = await admin.from('planner_items').select('user_id, id, data, deleted_at').in('user_id', users).is('deleted_at', null).filter('data->>date', 'eq', day);
  const planner = (pr ?? []) as Row[];
  const { data: dp } = await admin.from('day_plans').select('user_id, one_thing, one_thing_done').in('user_id', users).eq('day', day);
  const plans = new Map((dp ?? []).map((r: { user_id: string; one_thing: string | null; one_thing_done: boolean }) => [r.user_id, r]));
  const { data: lg } = await admin.from('push_log').select('user_id, key').in('user_id', users).gte('sent_at', new Date(now.getTime() - 36 * 3600000).toISOString());
  const logged = new Set((lg ?? []).map((r: { user_id: string; key: string }) => `${r.user_id}|${r.key}`));

  const msgs: (Msg & { user: string; fixedKey?: string })[] = [];
  const sentUsers = new Set<string>();

  for (const uid of users) {
    const mine = journal.filter((r) => r.user_id === uid);
    const cfgRow = mine.find((r) => r.id === 'cfg:disc')?.data;
    // No role chosen or nudges off: send nothing at all (opt-in).
    if (!cfgRow || cfgRow.nudgesOn !== true) continue;
    const role = cfgRow.role === 'priya' ? 'priya' : 'arpan';
    const lang = (cfgRow.nudgeLang === 'hi' || cfgRow.nudgeLang === 'en' ? cfgRow.nudgeLang : 'both') as NudgeLang;
    const every = cfgRow.nudgeEvery === 15 || cfgRow.nudgeEvery === 60 ? (cfgRow.nudgeEvery as 15 | 60) : 30;
    const cfg = { role, nudgeEvery: every, eveningCheckin: typeof cfgRow.eveningCheckin === 'string' ? cfgRow.eveningCheckin : '21:30', detoxCutoff: typeof cfgRow.detoxCutoff === 'string' ? cfgRow.detoxCutoff : '22:30' } as const;
    const userDevices = devices.filter((d) => d.user_id === uid);
    const lastOpen = Math.max(...userDevices.map((d) => new Date(d.last_open_at).getTime()));
    if (now.getTime() - lastOpen < 10 * 60000) continue; // they are in the app right now

    const send = (title: string, body: string, kind: string, route: string, key?: string) => {
      for (const d of userDevices) msgs.push({ to: d.token, title, body, data: { kind, route }, channelId: 'checkins', sound: 'default', priority: 'high', user: uid, fixedKey: key });
      sentUsers.add(uid);
    };

    // 1) Fixed prompts (timesheet, evening check-in, detox warning): once per day, inside the 15-minute window after their time.
    for (const f of fixedNotifications(cfg, lang)) {
      if (f.days && !f.days.includes(weekday)) continue;
      const t = toMin(f.time);
      if (nowMin < t || nowMin >= t + 15) continue;
      const key = `fx:${f.kind}:${day}`;
      if (logged.has(`${uid}|${key}`)) continue;
      send(f.title, f.body, f.kind, f.route, key);
    }
    if (sentUsers.has(uid)) continue; // never two in one run

    // 2) Adaptive nudge.
    const ignored = Math.max(...userDevices.map((d) => d.sent_since_open));
    const plan = plans.get(uid);
    const onStreak = !!plan?.one_thing_done && ignored === 0;
    let gap = nudgeGap(cfg, ignored, onStreak);
    if (ignored >= 8) gap = Math.max(gap, 180); // long silence: at most one every 3 hours, never none
    const lastSent = Math.max(0, ...userDevices.map((d) => (d.last_sent_at ? new Date(d.last_sent_at).getTime() : 0)));
    const sentToday = [...logged].filter((k) => k.startsWith(`${uid}|nd:${day}:`)).length;
    if (sentToday >= DAILY_CAP) continue;
    if (lastSent && now.getTime() - lastSent < gap * 60000 - 120000) continue;

    const open = planner.filter((r) => r.user_id === uid && r.data.done !== true);
    const water = Number(mine.find((r) => r.id === `water:${day}`)?.data.glasses ?? 0) || 0;
    const people = mine.filter((r) => r.id.startsWith('person:'));
    const due = people
      .map((r) => {
        const last = typeof r.data.lastContact === 'string' ? r.data.lastContact : null;
        const every2 = typeof r.data.everyDays === 'number' ? r.data.everyDays : 14;
        const since = last ? Math.floor((new Date(`${day}T12:00:00Z`).getTime() - new Date(`${last}T12:00:00Z`).getTime()) / 86400000) : null;
        return { name: String(r.data.name ?? '').split(' ')[0], since, over: since === null ? 0 : since - every2 };
      })
      .filter((p) => p.name && (p.since === null || p.over >= 0))
      .sort((a, b) => (b.since ?? 999) - (a.since ?? 999))[0];
    let billed = 0;
    let todayEntered = false;
    for (const r of mine.filter((x) => x.id.startsWith('bill:'))) {
      if (typeof r.data.amount === 'number') billed += r.data.amount;
      if (r.id === `bill:${day}`) todayEntered = true;
    }
    const target = typeof cfgRow.monthlyTarget === 'number' && cfgRow.monthlyTarget > 0 ? cfgRow.monthlyTarget : 1000000;
    const lastDay = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 0)).getUTCDate();
    const daysLeft = Math.max(1, lastDay - Number(day.slice(8)) + (todayEntered ? 0 : 1));
    const n = pickNudge({
      role,
      lang,
      hour,
      minute,
      weekday,
      oneThing: plan?.one_thing ?? undefined,
      oneThingDone: !!plan?.one_thing_done,
      openToday: open.length,
      firstPending: open[0] ? String(open[0].data.title ?? '') : undefined,
      waterGlasses: water,
      waterTarget: typeof cfgRow.waterTarget === 'number' ? cfgRow.waterTarget : 8,
      healthGoals: Array.isArray(cfgRow.healthGoals) ? (cfgRow.healthGoals as string[]) : [],
      duePerson: due ? { name: due.name, days: due.since } : undefined,
      billing: role === 'arpan' ? { total: billed, target, needPerDay: Math.ceil(Math.max(0, target - billed) / daysLeft), todayEntered } : undefined,
    });
    if (n) send(n.title, n.body, 'nudge', n.route, `nd:${day}:${hour}${minute}`);
  }

  // 3) A partner's push in Couple Space, delivered as a notification.
  const { data: cps } = await admin.from('couples').select('id, user_a, user_b').eq('status', 'active').or(users.map((u) => `user_a.eq.${u},user_b.eq.${u}`).join(','));
  for (const c of (cps ?? []) as { id: string; user_a: string; user_b: string }[]) {
    const { data: items } = await admin
      .from('couple_items')
      .select('id, author, data')
      .eq('couple_id', c.id)
      .eq('kind', 'note')
      .is('deleted_at', null)
      .gte('created_at', new Date(now.getTime() - 60 * 60000).toISOString())
      .filter('data->>type', 'eq', 'push');
    for (const it of (items ?? []) as { id: string; author: string; data: Record<string, unknown> }[]) {
      const to = it.author === c.user_a ? c.user_b : c.user_a;
      const key = `cp:${it.id}`;
      if (!users.includes(to) || logged.has(`${to}|${key}`)) continue;
      const { data: nm } = await admin.from('profiles').select('display_name').eq('user_id', it.author).maybeSingle();
      for (const d of devices.filter((x) => x.user_id === to))
        msgs.push({ to: d.token, title: `💪 ${nm?.display_name ?? 'Partner'}`, body: String(it.data.text ?? '').slice(0, 140), data: { kind: 'partner_push', route: '/couple' }, channelId: 'checkins', sound: 'default', priority: 'high', user: to, fixedKey: key });
    }
  }

  // Send in batches of 100 and drop phones Expo says are gone.
  let sent = 0;
  const dead = new Set<string>();
  for (let i = 0; i < msgs.length; i += 100) {
    const batch = msgs.slice(i, i + 100);
    try {
      const r = await fetch(EXPO, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(batch.map(({ user: _u, fixedKey: _k, ...m }) => m)) });
      const j = (await r.json()) as { data?: { status: string; details?: { error?: string } }[] };
      (j.data ?? []).forEach((t, k) => {
        if (t.status === 'ok') sent++;
        else if (t.details?.error === 'DeviceNotRegistered') dead.add(batch[k].to);
      });
    } catch {
      /* Expo unreachable: nothing is marked as sent, the next run tries again */
    }
  }
  if (dead.size) await admin.from('push_devices').delete().in('token', [...dead]);

  const stamp = now.toISOString();
  const sentOk = msgs.filter((m) => !dead.has(m.to));
  const byUser = new Map<string, string[]>();
  for (const m of sentOk) byUser.set(m.user, [...(byUser.get(m.user) ?? []), m.to]);
  for (const [uid, tokens] of byUser) {
    for (const d of devices.filter((x) => x.user_id === uid && tokens.includes(x.token)))
      await admin.from('push_devices').update({ last_sent_at: stamp, sent_since_open: d.sent_since_open + 1 }).eq('user_id', uid).eq('token', d.token);
  }
  const keys = [...new Map(sentOk.filter((m) => m.fixedKey).map((m) => [`${m.user}|${m.fixedKey}`, { user_id: m.user, key: m.fixedKey! }])).values()];
  if (keys.length) await admin.from('push_log').upsert(keys, { onConflict: 'user_id,key', ignoreDuplicates: true });

  console.log(JSON.stringify({ evt: 'nudge', users: users.length, queued: msgs.length, sent, removed: dead.size }));
  return json({ ok: true, sent, queued: msgs.length });
});
