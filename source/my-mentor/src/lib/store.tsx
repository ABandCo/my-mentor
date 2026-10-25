// Offline-first local store. Everything here is real user input — nothing is seeded.
// Changes are queued in an outbox and synced to Supabase when signed in (see sync.ts).
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { Collections, CollectionName, Row, nowIso } from './collections';
import type { NotifSettings } from './notification-plan';
import { supabase } from './supabase';
import { Op, flush, opsFor, pull, snapshotOps } from './sync';

export type HabitStatus = 'done' | 'partial' | 'missed' | 'rest' | 'na';
export type HourStatus = 'done' | 'partly' | 'missed';
export type CoachingStyle = 'strict' | 'balanced' | 'gentle' | 'reflective' | 'communication' | 'business';
export type Language = 'en' | 'hi' | 'hinglish';

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  target?: string;
  createdAt: string;
  /** Scheduled weekdays, 0 = Sunday … 6 = Saturday. Missing means every day. */
  days?: number[];
};
export type HourPlan = { plan: string; status?: HourStatus };
export type Commitment = { id: string; text: string; due?: string; done: boolean; createdAt: string };

export type Profile = {
  language: Language;
  coachingStyle: CoachingStyle;
  focusAreas: string[];
  wake: string; // HH:MM, India time
  sleep: string;
  intensiveStart: string;
  intensiveEnd: string;
  quietStart: string;
  quietEnd: string;
  aiConsentGeneral: boolean;
  aiConsentSensitive: boolean;
  baselines: Record<string, number>; // only what the user entered
  onboardedAt?: string;
};

/** A conversation with Krishna. Full transcripts stay on this phone only (pruned after `prefs.transcriptDays`). */
export type ChatCard = { kind: 'plan' | 'review' | 'extract'; data: unknown; applied?: boolean; sessionId?: string; decided?: Record<string, 'accepted' | 'dismissed'> };
export type ChatMsg = { id: string; role: 'user' | 'model'; text: string; at: string; crisis?: boolean; card?: ChatCard; offline?: boolean };
export type Chat = { id: string; mode: string; startedAt: string; messages: ChatMsg[]; endedAt?: string };

/** Per-phone preferences (not synced). */
export type Prefs = { maskNames: string[]; transcriptDays: number; haptics: boolean; sounds: boolean; speakReplies: boolean };
export const defaultPrefs: Prefs = { maskNames: [], transcriptDays: 30, haptics: true, sounds: false, speakReplies: false };

export type State = {
  hydrated: boolean;
  collections: Collections;
  chats: Chat[];
  prefs: Prefs;
  name: string;
  profile: Profile;
  oneThing: Record<string, { text: string; done: boolean }>; // by date
  hours: Record<string, HourPlan>; // key: YYYY-MM-DD:HH
  habits: Habit[];
  habitLogs: Record<string, Record<string, HabitStatus>>; // date -> habitId -> status
  commitments: Commitment[];
  mood: Record<string, number>; // date -> 1..5
  xp: number;
  outbox: Op[];
  syncedUserId?: string; // the account this device's data belongs to
  notif: NotifSettings; // per-device, not synced
};

export const defaultProfile: Profile = {
  language: 'en',
  coachingStyle: 'strict',
  focusAreas: ['accountability', 'communication', 'practice', 'health'],
  wake: '06:30',
  sleep: '22:30',
  intensiveStart: '09:00',
  intensiveEnd: '20:00',
  quietStart: '22:30',
  quietEnd: '06:30',
  aiConsentGeneral: false,
  aiConsentSensitive: false,
  baselines: {},
};

const initial: State = {
  hydrated: false,
  collections: {},
  chats: [],
  prefs: defaultPrefs,
  name: '',
  profile: defaultProfile,
  oneThing: {},
  hours: {},
  habits: [],
  habitLogs: {},
  commitments: [],
  mood: {},
  xp: 0,
  outbox: [],
  notif: { enabled: true },
};

export type Action =
  | { type: 'setName'; name: string }
  | { type: 'setProfile'; profile: Partial<Profile> }
  | { type: 'setOneThing'; date: string; text: string }
  | { type: 'toggleOneThing'; date: string }
  | { type: 'setHourPlan'; key: string; plan: string }
  | { type: 'setHourStatus'; key: string; status: HourStatus }
  | { type: 'addHabit'; habit: Habit }
  | { type: 'logHabit'; date: string; habitId: string; status: HabitStatus | undefined }
  | { type: 'addCommitment'; c: Commitment }
  | { type: 'toggleCommitment'; id: string }
  | { type: 'setMood'; date: string; mood: number }
  | { type: 'setNotif'; notif: Partial<NotifSettings> }
  | { type: 'col/put'; table: CollectionName; row: Partial<Row> & { id: string } }
  | { type: 'col/del'; table: CollectionName; id: string }
  | { type: 'setChats'; chats: Chat[] }
  | { type: 'chat/start'; chat: Chat }
  | { type: 'chat/append'; chatId: string; msg: ChatMsg }
  | { type: 'chat/patch'; chatId: string; msgId: string; patch: Partial<ChatMsg> | { card: Partial<ChatCard> } }
  | { type: 'chat/end'; chatId: string }
  | { type: 'setPrefs'; prefs: Partial<Prefs> };

type Internal =
  | Action
  | { type: 'hydrate'; state: Partial<State> }
  | { type: 'merge'; state: Partial<State> }
  | { type: 'enqueue'; ops: Op[] }
  | { type: 'setOutbox'; outbox: Op[] }
  | { type: 'reset' };

// XP rewards honest actions: logging, completing, and recovering. Missing is never penalised.
const XP = { log: 2, complete: 5, oneThing: 15, hourCheck: 3 };

function apply(s: State, a: Action): State {
  switch (a.type) {
    case 'setName':
      return { ...s, name: a.name };
    case 'setProfile':
      return { ...s, profile: { ...s.profile, ...a.profile } };
    case 'setOneThing':
      return { ...s, oneThing: { ...s.oneThing, [a.date]: { text: a.text, done: false } } };
    case 'toggleOneThing': {
      const cur = s.oneThing[a.date];
      if (!cur) return s;
      const done = !cur.done;
      return { ...s, oneThing: { ...s.oneThing, [a.date]: { ...cur, done } }, xp: Math.max(0, s.xp + (done ? XP.oneThing : -XP.oneThing)) };
    }
    case 'setHourPlan':
      return { ...s, hours: { ...s.hours, [a.key]: { plan: a.plan } } };
    case 'setHourStatus': {
      const cur = s.hours[a.key] ?? { plan: '' };
      const firstAnswer = !cur.status;
      return { ...s, hours: { ...s.hours, [a.key]: { ...cur, status: a.status } }, xp: s.xp + (firstAnswer ? XP.hourCheck : 0) };
    }
    case 'addHabit':
      return { ...s, habits: [...s.habits, a.habit] };
    case 'logHabit': {
      const day = { ...(s.habitLogs[a.date] ?? {}) };
      const prev = day[a.habitId];
      if (a.status) day[a.habitId] = a.status;
      else delete day[a.habitId];
      const gain = (st?: HabitStatus) => (st === 'done' ? XP.complete : st ? XP.log : 0);
      return { ...s, habitLogs: { ...s.habitLogs, [a.date]: day }, xp: Math.max(0, s.xp - gain(prev) + gain(a.status)) };
    }
    case 'addCommitment':
      return { ...s, commitments: [a.c, ...s.commitments] };
    case 'toggleCommitment':
      return { ...s, commitments: s.commitments.map((c) => (c.id === a.id ? { ...c, done: !c.done } : c)) };
    case 'setMood':
      return { ...s, mood: { ...s.mood, [a.date]: a.mood } };
    case 'setNotif':
      return { ...s, notif: { ...s.notif, ...a.notif } };
    case 'col/put': {
      const table = { ...(s.collections[a.table] ?? {}) };
      const t = nowIso();
      const prev = table[a.row.id];
      table[a.row.id] = { ...prev, ...a.row, createdAt: prev?.createdAt ?? a.row.createdAt ?? t, updatedAt: t } as Row;
      return { ...s, collections: { ...s.collections, [a.table]: table } };
    }
    case 'col/del': {
      const table = { ...(s.collections[a.table] ?? {}) };
      const prev = table[a.id];
      if (!prev) return s;
      const t = nowIso();
      table[a.id] = { ...prev, deletedAt: t, updatedAt: t };
      return { ...s, collections: { ...s.collections, [a.table]: table } };
    }
    case 'setChats':
      return { ...s, chats: a.chats };
    case 'chat/start':
      return { ...s, chats: [...s.chats, a.chat] };
    case 'chat/append':
      return { ...s, chats: s.chats.map((c) => (c.id === a.chatId ? { ...c, messages: [...c.messages, a.msg] } : c)) };
    case 'chat/patch':
      return {
        ...s,
        chats: s.chats.map((c) =>
          c.id !== a.chatId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id !== a.msgId) return m;
                  const p = a.patch as { card?: Partial<ChatCard> } & Partial<ChatMsg>;
                  return { ...m, ...p, card: p.card && m.card ? { ...m.card, ...p.card } : (p.card as ChatCard | undefined) ?? m.card };
                }),
              },
        ),
      };
    case 'chat/end':
      return { ...s, chats: s.chats.map((c) => (c.id === a.chatId ? { ...c, endedAt: nowIso() } : c)) };
    case 'setPrefs':
      return { ...s, prefs: { ...s.prefs, ...a.prefs } };
  }
}

function reducer(s: State, a: Internal): State {
  switch (a.type) {
    case 'hydrate':
      return {
        ...s,
        ...a.state,
        profile: { ...defaultProfile, ...(a.state.profile ?? {}) },
        notif: { ...initial.notif, ...(a.state.notif ?? {}) },
        prefs: { ...defaultPrefs, ...(a.state.prefs ?? {}) },
        collections: a.state.collections ?? {},
        chats: a.state.chats ?? [],
        hydrated: true,
      };
    case 'merge':
      return { ...s, ...a.state };
    case 'enqueue':
      return { ...s, outbox: [...s.outbox, ...a.ops] };
    case 'setOutbox':
      return { ...s, outbox: a.outbox };
    case 'reset':
      return { ...initial, hydrated: true };
    default: {
      const next = apply(s, a);
      return next === s ? s : { ...next, outbox: [...next.outbox, ...opsFor(a, next)] };
    }
  }
}

export type SyncStatus = 'local-only' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error';

type Ctx = {
  state: State;
  dispatch: (a: Action) => void;
  session: Session | null;
  authReady: boolean;
  sync: { status: SyncStatus; error?: string; pending: number };
  syncNow: () => void;
  signOut: () => Promise<void>;
  /** Wipe all local data on this phone (used after account deletion). */
  resetLocal: () => void;
};

const KEY = 'mymentor.v1';
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, raw] = useReducer(reducer, initial);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(supabase ? 'signed-out' : 'local-only');
  const [syncError, setSyncError] = useState<string>();
  const stateRef = useRef(state);
  stateRef.current = state;
  const flushing = useRef(false);

  // Load local data.
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((s) => raw({ type: 'hydrate', state: s ? JSON.parse(s) : {} }))
      .catch(() => raw({ type: 'hydrate', state: {} }));
  }, []);

  // Persist local data.
  useEffect(() => {
    if (!state.hydrated) return;
    const { hydrated, ...persist } = state;
    AsyncStorage.setItem(KEY, JSON.stringify(persist)).catch(() => {});
  }, [state]);

  // Auth session.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const runFlush = useCallback(async () => {
    const uid = session?.user.id;
    if (!uid || flushing.current) return;
    const box = stateRef.current.outbox;
    if (!box.length) {
      setSyncStatus('synced');
      return;
    }
    flushing.current = true;
    setSyncStatus('syncing');
    const res = await flush(box, uid);
    // Keep any ops added while we were flushing.
    const added = stateRef.current.outbox.slice(box.length);
    raw({ type: 'setOutbox', outbox: [...res.remaining, ...added] });
    flushing.current = false;
    if (res.error) {
      const offline = /fetch|network/i.test(res.error);
      setSyncStatus(offline ? 'offline' : 'error');
      setSyncError(offline ? undefined : res.error);
    } else {
      setSyncStatus(added.length ? 'syncing' : 'synced');
      setSyncError(undefined);
    }
  }, [session]);

  // On sign-in: pull + merge. If this device's data belonged to nobody yet, upload it once.
  useEffect(() => {
    if (!session || !state.hydrated) return;
    const uid = session.user.id;
    const s = stateRef.current;
    if (s.syncedUserId && s.syncedUserId !== uid) {
      // A different person signed in on this phone: never mix their data.
      raw({ type: 'reset' });
    }
    (async () => {
      setSyncStatus('syncing');
      const base = s.syncedUserId === uid ? s : s.syncedUserId ? { ...initial, hydrated: true } : s;
      const merged = await pull(base);
      if ('error' in merged) {
        setSyncStatus('error');
        setSyncError(String(merged.error));
        return;
      }
      raw({ type: 'merge', state: { ...merged, syncedUserId: uid } });
      if (!s.syncedUserId) raw({ type: 'setOutbox', outbox: snapshotOps({ ...base, ...merged } as State) });
      setTimeout(runFlush, 50);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, state.hydrated]);

  // Debounced flush whenever the outbox grows; retry every 60 s while anything is pending.
  useEffect(() => {
    if (!session || !state.outbox.length) return;
    const t = setTimeout(runFlush, 1500);
    const iv = setInterval(runFlush, 60000);
    return () => {
      clearTimeout(t);
      clearInterval(iv);
    };
  }, [state.outbox.length, session, runFlush]);

  const signOut = useCallback(async () => {
    await runFlush();
    await supabase?.auth.signOut();
  }, [runFlush]);

  const value = useMemo<Ctx>(
    () => ({
      state,
      dispatch: raw as (a: Action) => void,
      session,
      authReady,
      sync: { status: supabase ? (session ? syncStatus : 'signed-out') : 'local-only', error: syncError, pending: state.outbox.length },
      syncNow: runFlush,
      signOut,
      resetLocal: () => raw({ type: 'reset' }),
    }),
    [state, session, authReady, syncStatus, syncError, runFlush, signOut],
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
