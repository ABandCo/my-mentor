// Couple Space data access. Sharing is enforced by the database (RLS + RPCs, see migration 0003), not by this file:
//  - two consents are required to link (one creates an invite code, the other enters it),
//  - you can only create/edit/delete your OWN shared items; your partner can only read them,
//  - either person can end the link at any time and all shared items become invisible to both immediately.
// Nothing in the personal journal or mentor chats is ever sent here; only what you explicitly post.
import { useCallback, useEffect, useRef, useState } from 'react';

import type { CoupleItem, CoupleKind } from './couple-logic';
import { uid, useStore } from './store';
import { supabase } from './supabase';

export type { CoupleItem, CoupleKind };
export type CoupleInfo = { id: string; status: 'pending' | 'active' | 'ended'; inviteCode: string; isInviter: boolean };

const friendly = (m: string) =>
  /invalid or used code/i.test(m) ? 'That code is not valid or was already used. Ask your partner for a fresh one.'
  : /already linked|already.*invited/i.test(m) ? 'You are already linked or have an open invite.'
  : /fetch|network/i.test(m) ? 'No internet. Couple Space needs a connection.'
  : m;

export function useCouple() {
  const { session } = useStore();
  const me = session?.user.id;
  const [loading, setLoading] = useState(!!supabase);
  const [couple, setCouple] = useState<CoupleInfo | null>(null);
  const [partner, setPartner] = useState<string>('');
  const [items, setItems] = useState<CoupleItem[]>([]);
  const [error, setError] = useState<string>();
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (!supabase || !me || busy.current) return setLoading(false);
    busy.current = true;
    try {
      const { data: c, error: e1 } = await supabase.from('couples').select('id,status,invite_code,user_a').in('status', ['pending', 'active']).maybeSingle();
      if (e1) throw e1;
      if (!c) {
        setCouple(null);
        setItems([]);
        setPartner('');
      } else {
        setCouple({ id: c.id, status: c.status, inviteCode: c.invite_code, isInviter: c.user_a === me });
        if (c.status === 'active') {
          const [it, nm] = await Promise.all([
            supabase.from('couple_items').select('id,author,kind,data,created_at,updated_at').eq('couple_id', c.id).is('deleted_at', null).order('created_at', { ascending: false }).limit(400),
            supabase.rpc('couple_partner_name'),
          ]);
          if (it.error) throw it.error;
          setItems((it.data ?? []).map((r) => ({ id: r.id, author: r.author, kind: r.kind, data: (r.data ?? {}) as Record<string, unknown>, createdAt: r.created_at, updatedAt: r.updated_at })));
          setPartner(typeof nm.data === 'string' && nm.data ? nm.data : 'your partner');
        }
      }
      setError(undefined);
    } catch (e) {
      setError(friendly(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e)));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [me]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    try {
      const r = await fn();
      if (r.error) {
        setError(friendly(r.error.message));
        return false;
      }
      setError(undefined);
      await refresh();
      return true;
    } catch (e) {
      setError(friendly(e instanceof Error ? e.message : 'Something went wrong'));
      return false;
    }
  };

  return {
    me,
    loading,
    couple,
    partner,
    items,
    error,
    refresh,
    createInvite: () => run(() => supabase!.rpc('couple_create_invite')),
    accept: (code: string) => run(() => supabase!.rpc('couple_accept', { p_code: code })),
    end: () => run(() => supabase!.rpc('couple_end')),
    post: (kind: CoupleKind, data: Record<string, unknown>, id = uid()) =>
      run(() => supabase!.from('couple_items').upsert({ couple_id: couple!.id, id, kind, data, updated_at: new Date().toISOString() }, { onConflict: 'couple_id,id' })),
    remove: (id: string) => run(() => supabase!.from('couple_items').delete().eq('couple_id', couple!.id).eq('id', id)),
  };
}

export { agreements, mine, theirs } from './couple-logic';
