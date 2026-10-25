// Parses the link Supabase sends users back to after they tap "Confirm email" or "Reset password".
// Supabase redirects to  mymentor://auth-callback#access_token=…&refresh_token=…&type=signup|recovery
// (or  …#error=access_denied&error_code=otp_expired&error_description=…  when the link is stale).
// No runtime imports so Node's test runner can load it directly.

/** Where Supabase should send people after they tap an email link. Must match the Redirect URLs allow-list in Supabase. */
export const AUTH_REDIRECT = 'mymentor://auth-callback';

export type AuthLink = {
  type?: string; // 'signup' | 'recovery' | 'magiclink' | 'invite' | 'email_change'
  accessToken?: string;
  refreshToken?: string;
  code?: string;
  error?: string; // human-readable reason, if the link failed
};

const dec = (s: string) => {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s;
  }
};

function pairs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of s.split('&')) {
    if (!part) continue;
    const i = part.indexOf('=');
    out[dec(i < 0 ? part : part.slice(0, i))] = i < 0 ? '' : dec(part.slice(i + 1));
  }
  return out;
}

export function parseAuthUrl(url: string | null | undefined): AuthLink {
  if (!url) return {};
  const hash = url.indexOf('#');
  const query = url.indexOf('?');
  const queryPart = query >= 0 ? url.slice(query + 1, hash > query ? hash : undefined) : '';
  const hashPart = hash >= 0 ? url.slice(hash + 1) : '';
  const p = { ...pairs(queryPart), ...pairs(hashPart) };

  if (p.error || p.error_code) {
    const expired = p.error_code === 'otp_expired' || /expired|invalid/i.test(p.error_description ?? '');
    return {
      error: expired
        ? 'This link has expired or was already used. Go back and request a new one.'
        : p.error_description || 'This link could not be used. Go back and try again.',
    };
  }
  return {
    type: p.type,
    accessToken: p.access_token,
    refreshToken: p.refresh_token,
    code: p.code,
  };
}
