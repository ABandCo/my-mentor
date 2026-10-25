// The conversation engine behind the Mentor tab. Order of every message:
//  1) crisis check on the phone (no AI, no network)  2) mask private details  3) build context from real records
//  4) call the mentor function  5) un-mask the reply for display  6) on any failure: explain honestly + rules-based coach.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type Chat, type ChatMsg, uid, useStore } from '../store';
import { callMentor, type Msg } from './client';
import { glassesFromText, waterOn, waterRow } from '../discipline';
import { dateKey } from '../metrics';
import { buildContext, contextCategories } from './context';
import { CRISIS_REPLY, detectCrisis } from './crisis';
import { explain, FALLBACK_CODES, type AiCode } from './explain';
import { type MaskMap, maskDeep, maskText, unmaskText } from './mask';
import { offlineCoach } from './offline-coach';

export type Orb = 'idle' | 'listening' | 'thinking' | 'speaking' | 'firm' | 'celebrating';

export type PlanData = { oneThing: string; hourly: { hour: number; plan: string }[]; notes?: string };
export type ReviewData = { headline: string; wins: string[]; obstacles: string[]; patterns: string[]; changes: string[]; priorities: string[] };
export type ExtractData = {
  summary: string;
  actions: { type: 'commitment' | 'habit' | 'goal'; text: string; due?: string }[];
  memories: { kind: string; text: string }[];
};

export const QUICK_PROMPTS = {
  habits: 'Look at my habits and goals and push me hard on whatever is slipping. Be specific, use my numbers, and give me one thing to do today.',
  procrastinating: "I'm procrastinating. Help me start something I'm avoiding.",
  reset: "I've had a bad day and fell behind. Help me reset without beating myself up.",
} as const;

const now = () => new Date().toISOString();

export function useMentor() {
  const { state, dispatch } = useStore();
  const ref = useRef(state);
  ref.current = state;
  const [busy, setBusy] = useState(false);
  const [orb, setOrb] = useState<Orb>('idle');
  const [quota, setQuota] = useState<{ used: number; cap: number } | null>(null);
  const lang = state.profile.language;

  const chat: Chat | null = useMemo(() => [...state.chats].reverse().find((c) => !c.endedAt) ?? null, [state.chats]);

  // Prune old transcripts (kept on this phone only).
  useEffect(() => {
    if (!state.hydrated) return;
    const days = state.prefs.transcriptDays;
    if (!days) return;
    const cutoff = Date.now() - days * 86400000;
    const keep = state.chats.filter((c) => new Date(c.startedAt).getTime() >= cutoff);
    if (keep.length !== state.chats.length) dispatch({ type: 'setChats', chats: keep });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hydrated]);

  const openChat = useCallback(
    (mode = 'chat'): string => {
      const existing = [...ref.current.chats].reverse().find((c) => !c.endedAt);
      if (existing) return existing.id;
      const c: Chat = { id: uid(), mode, startedAt: now(), messages: [] };
      dispatch({ type: 'chat/start', chat: c });
      return c.id;
    },
    [dispatch],
  );

  const add = useCallback(
    (chatId: string, role: 'user' | 'model', text: string, extra: Partial<ChatMsg> = {}): string => {
      const msg: ChatMsg = { id: uid(), role, text, at: now(), ...extra };
      dispatch({ type: 'chat/append', chatId, msg });
      return msg.id;
    },
    [dispatch],
  );

  /** Mask the visible history + context. Returns the payload and the map that restores real names in the reply. */
  const prepare = useCallback((history: ChatMsg[], withContext = true) => {
    const s = ref.current;
    const names = s.prefs.maskNames;
    let map: MaskMap = {};
    const messages: Msg[] = history
      .filter((m) => !m.crisis && m.text.trim())
      .slice(-12)
      .map((m) => {
        const r = maskText(m.text, { names, map });
        map = r.map;
        return { role: m.role, text: r.text };
      });
    const categories = contextCategories(s.profile);
    let context: Record<string, unknown> = {};
    if (withContext) {
      const r = maskDeep(buildContext(s, categories), { names, map });
      map = r.map;
      context = r.value;
    }
    return { messages, context, categories, map };
  }, []);

  const failed = useCallback(
    (chatId: string, code: AiCode, used?: number, cap?: number) => {
      if (used !== undefined && cap) setQuota({ used, cap });
      const s = ref.current;
      const nudge = FALLBACK_CODES.includes(code) ? offlineCoach(s) : null;
      add(chatId, 'model', explain(code, s.profile.language) + (nudge ? `\n\n${nudge.title}: ${nudge.body}` : ''), { offline: true });
      setOrb(nudge?.tone === 'firm' ? 'firm' : 'idle');
    },
    [add],
  );

  const settle = useCallback((o: Orb = 'speaking') => {
    setOrb(o);
    setTimeout(() => setOrb('idle'), 1800);
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      const s = ref.current;
      const chatId = openChat('chat');
      const userId = add(chatId, 'user', text);

      if (detectCrisis(text)) {
        add(chatId, 'model', CRISIS_REPLY[s.profile.language], { crisis: true });
        setOrb('idle');
        return;
      }

      // "drank two glasses": logged on the phone from the text, before any AI call (works offline).
      const glasses = glassesFromText(text);
      if (glasses) {
        const day = dateKey();
        dispatch({ type: 'col/put', table: 'journal_entries', row: waterRow(day, waterOn(s.collections, day) + glasses) });
      }

      if (!s.profile.aiConsentGeneral) {
        failed(chatId, 'consent_required'); // nothing leaves the phone
        return;
      }
      setBusy(true);
      setOrb('thinking');
      const history: ChatMsg[] = [...(ref.current.chats.find((c) => c.id === chatId)?.messages ?? []), { id: userId, role: 'user', text, at: now() }];
      const dedup = history.filter((m, i, a) => a.findIndex((x) => x.id === m.id) === i);
      const p = prepare(dedup);
      const res = await callMentor({ mode: 'chat', messages: p.messages, context: p.context, categories: p.categories, lang: s.profile.language, style: s.profile.coachingStyle });
      setBusy(false);
      if (res.ok) {
        if (res.used !== undefined && res.cap) setQuota({ used: res.used, cap: res.cap });
        add(chatId, 'model', unmaskText(res.text ?? '', p.map), { crisis: !!res.crisis });
        settle();
      } else failed(chatId, res.code, res.used, res.cap);
    },
    [add, busy, dispatch, failed, openChat, prepare, settle],
  );

  const planDay = useCallback(async () => {
    if (busy) return;
    const s = ref.current;
    const chatId = openChat('plan_day');
    add(chatId, 'user', 'Plan my day.');
    if (!s.profile.aiConsentGeneral) return failed(chatId, 'consent_required');
    setBusy(true);
    setOrb('thinking');
    const p = prepare([{ id: 'x', role: 'user', text: 'Plan my day using what is recorded: my open commitments, habits, and the hours left today.', at: now() }]);
    const res = await callMentor<PlanData>({ mode: 'plan_day', messages: p.messages, context: p.context, categories: p.categories, lang: s.profile.language, style: s.profile.coachingStyle });
    setBusy(false);
    if (res.ok && res.data) {
      const d = res.data as PlanData;
      const unmasked: PlanData = { ...d, oneThing: unmaskText(d.oneThing, p.map), hourly: d.hourly.map((h) => ({ ...h, plan: unmaskText(h.plan, p.map) })), notes: d.notes ? unmaskText(d.notes, p.map) : undefined };
      if (res.used !== undefined && res.cap) setQuota({ used: res.used, cap: res.cap });
      add(chatId, 'model', `Here is a realistic plan. Your One Thing: ${unmasked.oneThing}`, { card: { kind: 'plan', data: unmasked } });
      settle();
    } else failed(chatId, res.ok ? 'ai_bad_format' : res.code, res.ok ? undefined : res.used, res.ok ? undefined : res.cap);
  }, [add, busy, failed, openChat, prepare, settle]);

  const review = useCallback(async () => {
    if (busy) return;
    const s = ref.current;
    const chatId = openChat('weekly_review');
    add(chatId, 'user', 'Review my week honestly.');
    if (!s.profile.aiConsentGeneral) return failed(chatId, 'consent_required');
    setBusy(true);
    setOrb('thinking');
    const p = prepare([{ id: 'x', role: 'user', text: 'Review my week using only what is recorded.', at: now() }]);
    const res = await callMentor<ReviewData>({ mode: 'weekly_review', messages: p.messages, context: p.context, categories: p.categories, lang: s.profile.language, style: s.profile.coachingStyle });
    setBusy(false);
    if (res.ok && res.data) {
      const d = res.data as ReviewData;
      const u = (x: string) => unmaskText(x, p.map);
      const data: ReviewData = { headline: u(d.headline), wins: d.wins.map(u), obstacles: d.obstacles.map(u), patterns: d.patterns.map(u), changes: d.changes.map(u), priorities: d.priorities.map(u) };
      if (res.used !== undefined && res.cap) setQuota({ used: res.used, cap: res.cap });
      add(chatId, 'model', data.headline, { card: { kind: 'review', data } });
      settle();
    } else failed(chatId, res.ok ? 'ai_bad_format' : res.code, res.ok ? undefined : res.used, res.ok ? undefined : res.cap);
  }, [add, busy, failed, openChat, prepare, settle]);

  /** Wrap up: summary + actions + memories to approve. Conversation stays open so the cards stay visible. */
  const finish = useCallback(async () => {
    if (busy || !chat) return;
    const s = ref.current;
    if (chat.messages.filter((m) => m.role === 'user').length < 2) return;
    if (!s.profile.aiConsentGeneral) return failed(chat.id, 'consent_required');
    setBusy(true);
    setOrb('thinking');
    const p = prepare(chat.messages, false);
    const res = await callMentor<ExtractData>({ mode: 'extract', messages: p.messages, categories: ['plans'], lang: s.profile.language, style: s.profile.coachingStyle });
    setBusy(false);
    if (res.ok && res.data) {
      const d = res.data as ExtractData;
      const u = (x: string) => unmaskText(x, p.map);
      const data: ExtractData = { summary: u(d.summary), actions: d.actions.map((a) => ({ ...a, text: u(a.text) })), memories: d.memories.map((m) => ({ ...m, text: u(m.text) })) };
      const sessionId = uid();
      dispatch({
        type: 'col/put',
        table: 'mentor_sessions',
        row: { id: sessionId, mode: chat.mode === 'weekly_review' || chat.mode === 'plan_day' ? chat.mode : 'chat', startedAt: chat.startedAt, endedAt: now(), summary: data.summary.slice(0, 2000), actions: data.actions, messageCount: chat.messages.length },
      });
      add(chat.id, 'model', data.summary || 'Nothing to save from this one.', { card: { kind: 'extract', data, sessionId } });
      settle('celebrating');
    } else failed(chat.id, res.ok ? 'ai_bad_format' : res.code, res.ok ? undefined : res.used, res.ok ? undefined : res.cap);
  }, [add, busy, chat, dispatch, failed, prepare, settle]);

  const newChat = useCallback(() => {
    const c = [...ref.current.chats].reverse().find((x) => !x.endedAt);
    if (c) dispatch({ type: 'chat/end', chatId: c.id });
    setOrb('idle');
  }, [dispatch]);

  return {
    chat,
    messages: chat?.messages ?? [],
    busy,
    orb,
    quota,
    lang,
    send,
    planDay,
    review,
    finish,
    newChat,
    canFinish: !!chat && chat.messages.filter((m) => m.role === 'user').length >= 2 && !chat.messages.some((m) => m.card?.kind === 'extract'),
  };
}
