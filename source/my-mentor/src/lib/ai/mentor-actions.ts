// Actions the cards inside the chat can take: apply a day plan, accept/dismiss what the mentor extracted.
import { useCallback, useRef } from 'react';

import { dateKey, istHour } from '../metrics';
import { uid, useStore } from '../store';
import type { PlanData } from './use-mentor';

export type SaveItem = { kind: 'commitment' | 'habit' | 'goal' | 'memory'; text: string; due?: string; memKind?: string };

export function useMentorActions() {
  const { state, dispatch } = useStore();
  const ref = useRef(state);
  ref.current = state;

  const applyPlan = useCallback(
    (chatId: string, msgId: string, plan: PlanData) => {
      const today = dateKey();
      const hourNow = istHour();
      if (!ref.current.oneThing[today]) dispatch({ type: 'setOneThing', date: today, text: plan.oneThing });
      for (const h of plan.hourly) {
        if (h.hour <= hourNow) continue; // never overwrite hours that already happened
        dispatch({ type: 'setHourPlan', key: `${today}:${String(h.hour).padStart(2, '0')}`, plan: h.plan });
      }
      dispatch({ type: 'chat/patch', chatId, msgId, patch: { card: { applied: true } } });
    },
    [dispatch],
  );

  /** Accepting creates the real commitment / habit / memory. Everything is only ever saved with the user's tap. */
  const decide = useCallback(
    (chatId: string, msgId: string, key: string, accept: boolean, item: SaveItem) => {
      if (accept) {
        const t = new Date().toISOString();
        if (item.kind === 'habit') dispatch({ type: 'addHabit', habit: { id: uid(), name: item.text.slice(0, 60), emoji: '✨', createdAt: t } });
        else if (item.kind === 'memory')
          dispatch({ type: 'col/put', table: 'mentor_memory', row: { id: uid(), kind: item.memKind ?? 'fact', text: item.text.slice(0, 400), source: 'session', confirmed: true, neverSendAi: false } });
        else dispatch({ type: 'addCommitment', c: { id: uid(), text: (item.kind === 'goal' ? '🎯 ' : '') + item.text, due: item.due, done: false, createdAt: t } });
      }
      const msg = ref.current.chats.find((c) => c.id === chatId)?.messages.find((m) => m.id === msgId);
      dispatch({ type: 'chat/patch', chatId, msgId, patch: { card: { decided: { ...(msg?.card?.decided ?? {}), [key]: accept ? 'accepted' : 'dismissed' } } } });
    },
    [dispatch],
  );

  return { applyPlan, decide };
}
