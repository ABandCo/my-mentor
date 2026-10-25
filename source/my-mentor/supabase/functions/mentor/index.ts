// "mentor" Edge Function: the only place the Gemini key lives.
// Flow: verify user -> check consent + daily cap -> mask private details -> call Gemini -> validate -> count usage.
// Content is never logged; only metadata (mode, model, token counts, timing, and Google's own error status text).
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { CRISIS_REPLY, detectCrisis } from './crisis.ts';
import { maskDeep, maskText } from './mask.ts';
import {
  buildContents,
  buildSystemPrompt,
  CATEGORIES,
  extractJson,
  filterContext,
  JSON_MODES,
  MODES,
  SENSITIVE,
  validate,
  type Category,
  type Lang,
  type Mode,
  type Msg,
  type Style,
} from './prompt.ts';

declare const Deno: {
  env: { get(k: string): string | undefined };
  serve(h: (r: Request) => Response | Promise<Response>): void;
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (obj: unknown, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'content-type': 'application/json' } });

const DAILY_CAP = Number(Deno.env.get('AI_DAILY_CAP') ?? 150);
const PER_MINUTE = Number(Deno.env.get('AI_PER_MINUTE') ?? 8);
const MODELS = (Deno.env.get('GEMINI_MODELS') ?? 'gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.6-flash,gemini-3.8-flash')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const STYLES = ['strict', 'balanced', 'gentle', 'reflective', 'communication', 'business'];
const LANGS = ['en', 'hi', 'hinglish'];

const recent = new Map<string, number[]>(); // best-effort per-minute limiter (per instance)
const tooFast = (uid: string) => {
  const now = Date.now();
  const hits = (recent.get(uid) ?? []).filter((t) => now - t < 60000);
  hits.push(now);
  recent.set(uid, hits);
  return hits.length > PER_MINUTE;
};

const todayIST = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

type GeminiOk = { ok: true; text: string; model: string; tokensIn: number; tokensOut: number };
type GeminiFail = { ok: false; code: 'ai_unconfigured' | 'ai_quota' | 'ai_unavailable'; status?: number; detail?: string };

/** Google's own error status and message, shortened, with anything key-shaped removed. Never contains user text. */
async function googleError(r: Response): Promise<string> {
  let t = '';
  try {
    t = await r.text();
  } catch {
    return `http ${r.status}`;
  }
  let msg = t;
  try {
    const j = JSON.parse(t);
    msg = `${j?.error?.status ?? ''}: ${j?.error?.message ?? ''}`;
  } catch {
    /* keep raw text */
  }
  return `http ${r.status} ${msg}`.replace(/AIza[0-9A-Za-z_\-]{20,}/g, '[key]').replace(/\s+/g, ' ').slice(0, 300);
}

async function callGemini(key: string, system: string, contents: unknown, json: boolean, maxTokens: number): Promise<GeminiOk | GeminiFail> {
  let sawQuota = false;
  let lastDetail = '';
  for (const model of MODELS) {
    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: json ? 0.2 : 0.7, maxOutputTokens: maxTokens, ...(json ? { responseMimeType: 'application/json' } : {}) },
    };
    let r: Response;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45000),
      });
    } catch {
      lastDetail = `${model}: network error or timeout`;
      continue; // network hiccup or timeout: try the next model
    }
    if (r.status === 400) {
      const d = await googleError(r);
      console.log(JSON.stringify({ evt: 'gemini_error', model, detail: d }));
      lastDetail = `${model}: ${d}`;
      if (/API key not valid|API_KEY_INVALID|api key expired/i.test(d)) return { ok: false, code: 'ai_unconfigured', status: 400, detail: lastDetail };
      continue;
    }
    if (r.status === 401 || r.status === 403) {
      const d = await googleError(r);
      console.log(JSON.stringify({ evt: 'gemini_error', model, detail: d }));
      return { ok: false, code: 'ai_unconfigured', status: r.status, detail: `${model}: ${d}` };
    }
    if (r.status === 429) {
      const d = await googleError(r);
      console.log(JSON.stringify({ evt: 'gemini_error', model, detail: d }));
      lastDetail = `${model}: ${d}`;
      sawQuota = true;
      continue;
    }
    if (!r.ok) {
      const d = await googleError(r);
      console.log(JSON.stringify({ evt: 'gemini_error', model, detail: d }));
      lastDetail = `${model}: ${d}`;
      continue; // 404 (model not on this key) and 5xx: next model
    }
    const j = await r.json();
    const text = ((j?.candidates?.[0]?.content?.parts ?? []) as { text?: string }[]).map((p) => p.text ?? '').join('').trim();
    if (!text) {
      lastDetail = `${model}: empty answer (finish: ${j?.candidates?.[0]?.finishReason ?? 'unknown'}, block: ${j?.promptFeedback?.blockReason ?? 'none'})`;
      console.log(JSON.stringify({ evt: 'gemini_empty', detail: lastDetail }));
      continue;
    }
    return { ok: true, text, model, tokensIn: j?.usageMetadata?.promptTokenCount ?? 0, tokensOut: j?.usageMetadata?.candidatesTokenCount ?? 0 };
  }
  return { ok: false, code: sawQuota ? 'ai_quota' : 'ai_unavailable', detail: lastDetail };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply({ ok: false, code: 'bad_request' }, 405);
  const t0 = Date.now();

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: who, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !who?.user) return reply({ ok: false, code: 'unauthorized' }, 401);
  const uid = who.user.id;

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 65536) return reply({ ok: false, code: 'too_large' });
    body = JSON.parse(raw);
  } catch {
    return reply({ ok: false, code: 'bad_request' });
  }
  const mode: Mode = MODES.includes(body.mode as Mode) ? (body.mode as Mode) : 'chat';

  const { data: prof } = await admin
    .from('profiles')
    .select('ai_consent_general, ai_consent_sensitive, coaching_style, language, display_name')
    .eq('user_id', uid)
    .maybeSingle();
  const lang: Lang = (LANGS.includes(String(body.lang)) ? body.lang : LANGS.includes(prof?.language) ? prof?.language : 'en') as Lang;
  const style: Style = (STYLES.includes(String(body.style)) ? body.style : STYLES.includes(prof?.coaching_style) ? prof?.coaching_style : 'strict') as Style;

  const { data: usage } = await admin.from('ai_usage').select('requests').eq('user_id', uid).eq('day', todayIST()).maybeSingle();
  const used = usage?.requests ?? 0;
  const key = Deno.env.get('GEMINI_API_KEY');

  if (mode === 'ping') {
    return reply({
      ok: true,
      mode,
      configured: !!key,
      models: MODELS,
      used,
      cap: DAILY_CAP,
      consent: { general: !!prof?.ai_consent_general, sensitive: !!prof?.ai_consent_sensitive },
    });
  }

  if (!prof?.ai_consent_general) return reply({ ok: false, code: 'consent_required', used, cap: DAILY_CAP });
  if (!key) return reply({ ok: false, code: 'ai_unconfigured', used, cap: DAILY_CAP });
  if (used >= DAILY_CAP) return reply({ ok: false, code: 'daily_cap', used, cap: DAILY_CAP });
  if (tooFast(uid)) return reply({ ok: false, code: 'slow_down', used, cap: DAILY_CAP });

  // Messages: at most 24, 2000 chars each, roles checked, private details masked again here.
  const rawMsgs = Array.isArray(body.messages) ? (body.messages as unknown[]).slice(-24) : [];
  const messages: Msg[] = rawMsgs
    .map((m) => m as Record<string, unknown>)
    .filter((m) => (m?.role === 'user' || m?.role === 'model') && typeof m?.text === 'string' && (m.text as string).trim())
    .map((m) => ({ role: m.role as 'user' | 'model', text: maskText((m.text as string).slice(0, 2000)).text }));
  if (messages.length === 0 && mode !== 'plan_day' && mode !== 'weekly_review') return reply({ ok: false, code: 'bad_request' });

  // Crisis: do not call the AI. Answer with care and real help lines.
  if (messages.some((m) => m.role === 'user' && detectCrisis(m.text))) {
    console.log(JSON.stringify({ evt: 'mentor', mode, status: 'crisis_handled', ms: Date.now() - t0 }));
    return reply({ ok: true, mode, crisis: true, text: CRISIS_REPLY[lang], data: mode === 'extract' ? { summary: '', actions: [], memories: [] } : undefined, used, cap: DAILY_CAP });
  }

  // Privacy: only categories the user allowed. Sensitive ones need the extra consent.
  const asked = (Array.isArray(body.categories) ? body.categories : ['plans']).filter((c): c is Category => CATEGORIES.includes(c as Category));
  const allowed = asked.filter((c) => !SENSITIVE.includes(c) || !!prof?.ai_consent_sensitive);
  const dropped = asked.filter((c) => !allowed.includes(c));
  const context = maskDeep(filterContext(body.context, allowed)).value;

  const { data: memRows } = await admin
    .from('mentor_memory')
    .select('kind, text')
    .eq('user_id', uid)
    .eq('confirmed', true)
    .eq('never_send_ai', false)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(40);
  const memory = (memRows ?? []).map((m: { kind: string; text: string }) => ({ kind: m.kind, text: maskText(m.text).text }));

  const system = buildSystemPrompt({ style, lang, name: prof?.display_name || undefined, mode, memory });
  const contents = buildContents(messages, context, mode);
  const json = JSON_MODES.includes(mode);
  const maxTokens = json ? 1800 : 1200;

  let res = await callGemini(key, system, contents, json, maxTokens);
  let data: Record<string, unknown> | null = null;
  if (res.ok && json) {
    data = validate(mode, extractJson(res.text));
    if (!data) {
      // One repair attempt.
      const again = [...(contents as unknown[]), { role: 'model', parts: [{ text: res.text }] }, { role: 'user', parts: [{ text: 'That was not valid JSON in the required shape. Reply with the JSON object only.' }] }];
      const second = await callGemini(key, system, again, true, maxTokens);
      if (second.ok) {
        data = validate(mode, extractJson(second.text));
        res = { ...second, tokensIn: second.tokensIn + res.tokensIn, tokensOut: second.tokensOut + res.tokensOut };
      }
    }
  }

  if (!res.ok) {
    console.log(JSON.stringify({ evt: 'mentor', mode, status: res.code, detail: res.detail, ms: Date.now() - t0 }));
    return reply({ ok: false, code: res.code, detail: res.detail, used, cap: DAILY_CAP });
  }
  if (json && !data) {
    console.log(JSON.stringify({ evt: 'mentor', mode, model: res.model, status: 'bad_format', ms: Date.now() - t0 }));
    return reply({ ok: false, code: 'ai_bad_format', used, cap: DAILY_CAP });
  }

  await admin.rpc('bump_ai_usage', { p_user: uid, p_in: res.tokensIn, p_out: res.tokensOut });
  console.log(JSON.stringify({ evt: 'mentor', mode, model: res.model, status: 'ok', in: res.tokensIn, out: res.tokensOut, ms: Date.now() - t0 }));
  return reply({ ok: true, mode, model: res.model, ...(json ? { data } : { text: res.text }), dropped, used: used + 1, cap: DAILY_CAP });
});
