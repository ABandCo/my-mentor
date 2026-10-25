// Talks to the "mentor" Edge Function. The Gemini key never touches the phone.
import { supabase } from '../supabase';
import type { AiCode } from './explain';

export type Mode = 'ping' | 'chat' | 'plan_day' | 'extract' | 'weekly_review' | 'comm_score' | 'goal_plan' | 'biz_plan';
export type Msg = { role: 'user' | 'model'; text: string };

export type AiRequest = {
  mode: Mode;
  messages?: Msg[];
  context?: Record<string, unknown>;
  categories?: ('plans' | 'work' | 'health' | 'journal')[];
  lang?: 'en' | 'hi' | 'hinglish';
  style?: string;
};
export type AiOk<T = unknown> = { ok: true; text?: string; data?: T; model?: string; used?: number; cap?: number; crisis?: boolean; dropped?: string[]; [k: string]: unknown };
export type AiFail = { ok: false; code: AiCode; used?: number; cap?: number };
export type AiResult<T = unknown> = AiOk<T> | AiFail;

const fail = (code: AiCode, extra: Partial<AiFail> = {}): AiFail => ({ ok: false, code, ...extra });

export async function callMentor<T = unknown>(req: AiRequest): Promise<AiResult<T>> {
  if (!supabase) return fail('not_signed_in');
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return fail('not_signed_in');
  try {
    const { data, error } = await supabase.functions.invoke('mentor', { body: req });
    if (error) {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        try {
          const j = await ctx.json();
          if (j?.code) return fail(j.code as AiCode, { used: j.used, cap: j.cap });
        } catch {
          /* fall through */
        }
      }
      return fail(/fetch|network|failed to send/i.test(error.message) ? 'offline' : 'ai_unavailable');
    }
    if (!data || typeof data !== 'object') return fail('ai_unavailable');
    if ((data as { ok?: boolean }).ok === false) return fail((data as { code: AiCode }).code ?? 'ai_unavailable', { used: (data as AiFail).used, cap: (data as AiFail).cap });
    return data as AiOk<T>;
  } catch {
    return fail('offline');
  }
}

export type PingInfo = { configured: boolean; models: string[]; used: number; cap: number; consent: { general: boolean; sensitive: boolean } };
export async function pingMentor(): Promise<{ ok: true; info: PingInfo } | AiFail> {
  const r = await callMentor<never>({ mode: 'ping' });
  if (!r.ok) return r;
  return { ok: true, info: { configured: !!r.configured, models: (r.models as string[]) ?? [], used: Number(r.used ?? 0), cap: Number(r.cap ?? 0), consent: (r.consent as PingInfo['consent']) ?? { general: false, sensitive: false } } };
}
