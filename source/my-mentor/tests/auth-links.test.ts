import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AUTH_REDIRECT, parseAuthUrl } from '../src/lib/auth-links.ts';

test('signup confirmation link carries tokens and type', () => {
  const l = parseAuthUrl('mymentor://auth-callback#access_token=AAA.bbb.ccc&expires_in=3600&refresh_token=rrr&token_type=bearer&type=signup');
  assert.equal(l.accessToken, 'AAA.bbb.ccc');
  assert.equal(l.refreshToken, 'rrr');
  assert.equal(l.type, 'signup');
  assert.equal(l.error, undefined);
});

test('password recovery link is recognised', () => {
  const l = parseAuthUrl('mymentor://auth-callback#access_token=a&refresh_token=b&type=recovery');
  assert.equal(l.type, 'recovery');
  assert.equal(l.accessToken, 'a');
});

test('expired link gives a friendly message, no tokens', () => {
  const l = parseAuthUrl('mymentor://auth-callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  assert.match(l.error ?? '', /expired or was already used/);
  assert.equal(l.accessToken, undefined);
});

test('other errors surface the server description', () => {
  const l = parseAuthUrl('mymentor://auth-callback#error=server_error&error_description=Database+error');
  assert.equal(l.error, 'Database error');
});

test('PKCE style code in the query string', () => {
  assert.equal(parseAuthUrl('mymentor://auth-callback?code=abc123').code, 'abc123');
});

test('query and fragment can both be present', () => {
  const l = parseAuthUrl('mymentor://auth-callback?foo=1#access_token=x&refresh_token=y');
  assert.equal(l.accessToken, 'x');
  assert.equal(l.refreshToken, 'y');
});

test('empty, null and token-less links are harmless', () => {
  assert.deepEqual(parseAuthUrl(null), {});
  assert.deepEqual(parseAuthUrl(''), {});
  const l = parseAuthUrl('mymentor://auth-callback');
  assert.equal(l.accessToken, undefined);
  assert.equal(l.error, undefined);
});

test('encoded characters in tokens are decoded', () => {
  assert.equal(parseAuthUrl('mymentor://auth-callback#access_token=a%2Bb%3Dc&refresh_token=r').accessToken, 'a+b=c');
});

test('redirect constant matches the app scheme and route', () => {
  assert.equal(AUTH_REDIRECT, 'mymentor://auth-callback');
});
