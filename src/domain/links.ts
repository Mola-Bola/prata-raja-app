export function isHttpUrl(s: string | null | undefined): boolean {
  if (!s) return false;
  try {
    const u = new URL(s.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Query and fragment parameters of a sign-in callback URL, e.g.
 * "prata-raja://auth-callback#access_token=…&refresh_token=…" or "…?code=…" or "…#error_description=…".
 * Hand-rolled because React Native's URLSearchParams is incomplete.
 */
export function authCallbackParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const start = url.search(/[?#]/);
  if (start < 0) return out;
  for (const part of url.slice(start + 1).split(/[&?#]/)) {
    const eq = part.indexOf('=');
    const k = eq < 0 ? part : part.slice(0, eq);
    if (!k) continue;
    const decode = (s: string) => {
      try {
        return decodeURIComponent(s.replace(/\+/g, ' '));
      } catch {
        return s;
      }
    };
    out[decode(k)] = eq < 0 ? '' : decode(part.slice(eq + 1));
  }
  return out;
}

/**
 * Is this a link back into the app that carries a sign-in (an email's confirm or password link, or Google's return)?
 * "prata-raja://auth-callback#access_token=…&refresh_token=…", "prata-raja://reset-password?code=…". Errors count too, so the
 * handler can see the link and drop it. Web addresses never match: the web app reads its own address.
 */
export function isNativeAuthLink(url: string | null | undefined): boolean {
  if (!url || !/^prata-raja:\/\/\/?(auth-callback|reset-password)\/?([?#]|$)/i.test(url)) return false;
  const p = authCallbackParams(url);
  return !!(p.access_token || p.code || p.error || p.error_code || p.error_description);
}

/**
 * What an auth link (an email's "choose a new password" or "confirm" link, or Google's return) brought back in the
 * web address. Read it before supabase-js takes the address apart.
 * - `recovery`: a password link that signed them in.
 * - `expired`: a link that was used already or ran out ("otp_expired"), or any error on the password page.
 * - `error`: anything else, e.g. Google saying that account is taken.
 */
export type AuthLinkResult = { kind: 'recovery' } | { kind: 'expired' } | { kind: 'error'; code: string; message: string };

const EXPIRED_LINK = /^(otp_expired|flow_state_expired|flow_state_not_found)$/;

export function authLinkResult(url: string | null | undefined): AuthLinkResult | null {
  if (!url) return null;
  const p = authCallbackParams(url);
  if (p.error || p.error_code || p.error_description) {
    const onResetPage = /\/reset-password\/?$/.test(url.replace(/[?#].*$/, ''));
    if (onResetPage || EXPIRED_LINK.test(p.error_code ?? '') || /invalid or has expired/i.test(p.error_description ?? '')) return { kind: 'expired' };
    return { kind: 'error', code: p.error_code || p.error || '', message: p.error_description || p.error || '' };
  }
  return p.type === 'recovery' ? { kind: 'recovery' } : null;
}

/** After choosing a new password: back to the page they were on (a plain in-app path), otherwise Today. */
export function resetReturnPath(next: string | string[] | undefined): string {
  const to = Array.isArray(next) ? next[0] : next;
  return to && /^\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/.test(to) && !SIGNED_OUT_ROUTE.test(to) ? to : '/';
}

/**
 * Route for a link Android handed to the app while it was still starting (so the router never got it), or null when
 * there's nothing to open: no link, the bare app ("prata-raja:///"), a web link, or the screen already showing.
 * "prata-raja://log?x=1#y" → "/log?x=1".
 */
export function startupLinkPath(recorded: string | null | undefined, currentPath: string): string | null {
  const m = recorded?.match(/^([a-z][a-z0-9+.-]*):\/\/\/?([^#]*)/i);
  if (!m || /^https?$/i.test(m[1])) return null;
  const [path, query] = m[2].split(/\?(.*)/s);
  const route = `/${path.replace(/\/+$/, '')}`;
  if (route === '/' || route === currentPath) return null;
  return query ? `${route}?${query}` : route;
}

/** Screens that work signed out (and the start page): never somewhere to come back to after signing in. */
const SIGNED_OUT_ROUTE = /^\/(welcome|sign-in|reset-password|auth-callback|play)?(\/|$)/;

/**
 * The in-app page a link pointed at, to open once the person has signed in (the sign-in guard sends a signed-out
 * visitor to Welcome and would otherwise drop it). "https://host/prata-raja/log?day=2#x" with base "/prata-raja" →
 * "/log?day=2"; "prata-raja://appointments/1" → "/appointments/1". Null for the start page and signed-out screens.
 */
export function returnPathAfterSignIn(url: string | null | undefined, basePath = ''): string | null {
  const m = url?.match(/^([a-z][a-z0-9+.-]*):\/\/([^?#]*)(\?[^#]*)?/i);
  if (!m) return null;
  // Web links: drop the host. App links (prata-raja://appointments/1): everything after "://" is the path.
  let path = /^https?$/i.test(m[1]) ? m[2].replace(/^[^/]*/, '') : `/${m[2].replace(/^\/+/, '')}`;
  const base = basePath.replace(/\/+$/, '');
  if (base && (path === base || path.startsWith(`${base}/`))) path = path.slice(base.length);
  path = `/${path.replace(/^\/+|\/+$/g, '')}`;
  if (SIGNED_OUT_ROUTE.test(path)) return null;
  return `${path}${m[3] && m[3] !== '?' ? m[3] : ''}`;
}
