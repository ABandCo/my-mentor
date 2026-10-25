// Privacy masking applied BEFORE any text leaves the phone for the AI, and again on the server.
// Same file lives in src/lib/ai/mask.ts (a test keeps the two identical). No imports: runs in Node, Deno and React Native.

export type MaskMap = Record<string, string>; // placeholder -> original (kept on the phone only)

// Order matters: longer / more specific patterns first.
const PATTERNS: [RegExp, string][] = [
  [/\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/g, '[GSTIN]'],
  [/\b[A-Z]{5}\d{4}[A-Z]\b/g, '[PAN]'],
  [/\b[A-Z]{4}0[A-Z0-9]{6}\b/g, '[IFSC]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]'],
  [/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[Aadhaar]'],
  [/(?:\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/g, '[phone]'],
  [/\b\d{9,18}\b/g, '[account no.]'],
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Replace identifiers with placeholders. `names` are client / person names the user does not want sent;
 * each gets a stable "Client A", "Client B"… label (case-insensitive, whole-word). The returned map lets the
 * phone put the real names back into the mentor's reply.
 */
export function maskText(text: string, opts: { names?: string[]; map?: MaskMap } = {}): { text: string; map: MaskMap } {
  const map: MaskMap = { ...(opts.map ?? {}) };
  let out = text;

  const names = [...new Set((opts.names ?? []).map((n) => n.trim()).filter((n) => n.length >= 2))].sort((a, b) => b.length - a.length);
  for (const name of names) {
    let label = Object.keys(map).find((k) => map[k].toLowerCase() === name.toLowerCase());
    if (!label) {
      const used = Object.keys(map).filter((k) => k.startsWith('Client ')).length;
      label = `Client ${LETTERS[used % 26]}${used >= 26 ? Math.floor(used / 26) : ''}`;
      map[label] = name;
    }
    out = out.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(name)}(?![\\p{L}\\p{N}])`, 'giu'), (_m, pre: string) => `${pre}${label}`);
  }
  for (const [re, label] of PATTERNS) out = out.replace(re, label);
  return { text: out, map };
}

/** Put real names back into text that came from the AI (phone only). */
export function unmaskText(text: string, map: MaskMap): string {
  let out = text;
  for (const label of Object.keys(map).sort((a, b) => b.length - a.length)) out = out.split(label).join(map[label]);
  return out;
}

/** Recursively mask every string inside a JSON-like value. */
export function maskDeep<T>(value: T, opts: { names?: string[]; map?: MaskMap } = {}): { value: T; map: MaskMap } {
  let map: MaskMap = { ...(opts.map ?? {}) };
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      const r = maskText(v, { names: opts.names, map });
      map = r.map;
      return r.text;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return { value: walk(value) as T, map };
}
