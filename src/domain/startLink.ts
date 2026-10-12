import { authCallbackParams } from './links';

/** Keys an auth link (confirm email, new password, Google's return) brings back in its query or fragment. */
const AUTH_KEYS = /^(access_token|refresh_token|code|type|error|error_code|error_description)$/;

/**
 * Was the app opened on its bare start page, with nothing to go to? "https://host/prata-raja/" (basePath "/prata-raja"),
 * "prata-raja://", or no link at all (opened from the icon). A link to a page, or one that carries a sign-in result, is
 * not: it opens where it points. The app opens straight into the game from the start page (useLaunchIntoGame).
 */
export function isStartLink(url: string | null | undefined, basePath = ''): boolean {
  if (!url) return true;
  const m = url.match(/^([a-z][a-z0-9+.-]*):\/\/([^?#]*)/i);
  if (!m) return false;
  if (Object.keys(authCallbackParams(url)).some((k) => AUTH_KEYS.test(k))) return false;
  let path = /^https?$/i.test(m[1]) ? m[2].replace(/^[^/]*/, '') : `/${m[2]}`;
  const base = basePath.replace(/\/+$/, '');
  if (base && (path === base || path.startsWith(`${base}/`))) path = path.slice(base.length);
  return path.replace(/\/+$/, '') === '';
}
