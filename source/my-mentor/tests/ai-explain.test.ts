import assert from 'node:assert/strict';
import { test } from 'node:test';

import { explain, FALLBACK_CODES, type AiCode } from '../src/lib/ai/explain.ts';

const CODES: AiCode[] = ['offline', 'not_signed_in', 'consent_required', 'ai_unconfigured', 'daily_cap', 'ai_quota', 'ai_unavailable', 'ai_bad_format', 'slow_down', 'unauthorized', 'bad_request', 'too_large'];

test('every failure code has a human message in all three languages', () => {
  for (const c of CODES) for (const l of ['en', 'hi', 'hinglish'] as const) assert.ok(explain(c, l).length > 20, `${c}/${l}`);
});

test('messages never blame the user or expose technical detail', () => {
  for (const c of CODES) {
    const m = explain(c, 'en');
    assert.ok(!/error|exception|stack|500|429|undefined|null/i.test(m), `${c}: ${m}`);
  }
});

test('limits tell the user what still works', () => {
  for (const c of ['offline', 'ai_unconfigured', 'daily_cap', 'ai_quota'] as AiCode[]) assert.match(explain(c, 'en'), /still work|keeps working|work/);
});

test('consent message says nothing was sent', () => {
  assert.match(explain('consent_required', 'en'), /Nothing has been sent/);
});

test('fallback codes are the ones where retrying immediately is pointless', () => {
  assert.ok(FALLBACK_CODES.includes('daily_cap'));
  assert.ok(!FALLBACK_CODES.includes('slow_down'));
  assert.ok(!FALLBACK_CODES.includes('ai_bad_format'));
});
