import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { authCallbackParams, isNativeAuthLink } from '@/domain';

import { isDeviceOnline, isServerDown } from './connection';
import type { Tables, TablesUpdate } from './database.types';
import { dataOwner, ownerChanged, runUserChangeResets, setDataOwner } from './deviceScope';
import { friendlyError, must } from './errors';
import { qk } from './keys';
import { clearQueryCache } from './query';
import { sessionToKeep } from './savedSession';
import { forgetSavedSession, OPENED_WITH_SIGN_IN, savedSession, SERVER_URL, SUPABASE_KEY, supabase, WEB_URL } from './supabase';

export type Profile = Tables<'profiles'>;

/** Where email links (confirm sign-up, confirm a new email) land: the web app, which signs people straight in.
 *  Without it the browser's Referer (the site root) wins and people land on a GitHub 404. */
const NATIVE_CALLBACK = 'prata-raja://auth-callback';
/** Native Google sign-in and the sign-up confirmation email return here (src/app/auth-callback.tsx); it must be
 *  allowed in the auth redirect URLs. On the web the email lands on the web app. */
const EMAIL_REDIRECT = Platform.OS === 'web' ? `${WEB_URL}/` : NATIVE_CALLBACK;
/** Where the "choose a new password" email lands (src/app/reset-password.tsx). */
const RESET_REDIRECT = Platform.OS === 'web' ? `${WEB_URL}/reset-password` : 'prata-raja://reset-password';

type OAuthStart = (redirectTo: string, skipBrowserRedirect: boolean) => Promise<{ data: { url: string | null } | null; error: unknown }>;

/**
 * Google sign-in (or linking Google to a guest account). Web: the page leaves for Google and comes back signed in.
 * Apps: an in-app browser returns to prata-raja://auth-callback with the session, which is saved here.
 */
async function googleViaBrowser(start: OAuthStart): Promise<void> {
  if (Platform.OS === 'web') {
    const { error } = await start(EMAIL_REDIRECT, false);
    if (error) throw friendlyError(error);
    return;
  }
  const { data, error } = await start(NATIVE_CALLBACK, true);
  if (error || !data?.url) throw friendlyError(error ?? { message: 'Google sign-in didn’t start. Please try again.' });
  const res = await WebBrowser.openAuthSessionAsync(data.url, NATIVE_CALLBACK);
  if (res.type !== 'success') return; // closed the browser: nothing to do
  await signInFromLink(res.url);
}

const handledLinks = new Set<string>();

/**
 * Finish a sign-in that came back as a link (tokens or a code in the address, or an error). The same link can reach
 * us twice (the in-app browser's result and the router's link event), so each one is used once.
 */
async function signInFromLink(url: string): Promise<void> {
  if (handledLinks.has(url)) return;
  handledLinks.add(url);
  const p = authCallbackParams(url);
  if (p.error_description || p.error) throw friendlyError({ message: p.error_description || p.error, code: p.error_code });
  const done = p.code
    ? await supabase.auth.exchangeCodeForSession(p.code)
    : p.access_token && p.refresh_token
      ? await supabase.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token })
      : null;
  if (!done) throw friendlyError({ message: 'Sign-in didn’t finish. Please try again.' });
  if (done.error) throw friendlyError(done.error);
}

type AuthCtx = {
  session: Session | null;
  userId: string | null;
  email: string | null;
  isAnonymous: boolean;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  /** Why the profile couldn't load. Null while loading, once loaded, or while waiting for the connection. */
  profileError: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  /** Web: leaves the page for Google and comes back signed in. Native: in-app browser, then signed in. */
  signInWithGoogle: () => Promise<void>;
  /** A guest account keeps everything and becomes a Google account: same user, Google added. */
  saveWithGoogle: () => Promise<void>;
  /** Emails a link that opens /reset-password signed in, where they choose a new password. `next` ("/i/<token>")
   *  is where to go afterwards: back to the page they were on. */
  sendPasswordReset: (email: string, next?: string) => Promise<void>;
  setNewPassword: (password: string) => Promise<void>;
  /** For guests: no email or password, just a name. */
  signInAnon: (name: string) => Promise<void>;
  /** Turn an anonymous account into a permanent one (same user id, keeps everything). */
  secureAccount: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: TablesUpdate<'profiles'>) => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

/**
 * Whenever the signed-in person changes (sign in, sign out, a session that was revoked, another tab), clear what the
 * device kept for the previous one: the cached data, changes waiting to sync, and drafts. A session that couldn't be
 * renewed because the app can't be reached is not a change (src/data/savedSession.ts).
 */
function claimDeviceFor(userId: string | null) {
  if (!ownerChanged(dataOwner(), userId)) return;
  setDataOwner(userId);
  clearQueryCache({ refetchActive: !!userId });
  runUserChangeResets();
}

/**
 * The session to open the app with, before supabase-js has checked it: the one saved for the person whose data this
 * device holds. Checking it can take ~30 s offline (supabase-js retries renewing an expired one); meanwhile the app
 * shows the saved copy instead of a blank page. Not when this page is the end of a sign-in link (someone new).
 */
function sessionToStartWith(): Session | null {
  if (OPENED_WITH_SIGN_IN) return null;
  const s = savedSession();
  return s && !ownerChanged(dataOwner(), s.user.id) ? s : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(sessionToStartWith);
  const [ready, setReady] = useState(() => session !== null);
  const qc = useQueryClient();

  useEffect(() => {
    const apply = (event: AuthChangeEvent | 'GET_SESSION', next: Session | null) => {
      const s = sessionToKeep(event, next, savedSession());
      claimDeviceFor(s?.user.id ?? null);
      setSession(s);
    };
    supabase.auth.getSession().then(({ data }) => {
      apply('GET_SESSION', data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange(apply);
    return () => data.subscription.unsubscribe();
  }, []);

  // Apps: the confirm-your-email and password links open the app with the session in the address.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const open = (link: string | null) => {
      if (isNativeAuthLink(link)) signInFromLink(link!).catch(() => {}); // an expired link just leaves them on Welcome
    };
    open(Linking.getLinkingURL());
    const sub = Linking.addEventListener('url', (e) => open(e.url));
    return () => sub.remove();
  }, []);

  const userId = session?.user.id ?? null;

  const profileQ = useQuery({
    queryKey: qk.profile(userId),
    enabled: !!userId,
    queryFn: async () => must(await supabase.from('profiles').select('*').eq('id', userId!).single()),
  });

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw friendlyError(error);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() }, emailRedirectTo: EMAIL_REDIRECT },
    });
    if (error) throw friendlyError(error);
    if (!data.session) throw friendlyError({ message: 'Check your email to confirm your account, then sign in.' });
  }, []);

  const signInWithGoogle = useCallback(
    () =>
      googleViaBrowser((redirectTo, skipBrowserRedirect) =>
        supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect } }),
      ),
    [],
  );

  const saveWithGoogle = useCallback(
    () =>
      googleViaBrowser((redirectTo, skipBrowserRedirect) =>
        supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo, skipBrowserRedirect } }),
      ),
    [],
  );

  const sendPasswordReset = useCallback(async (email: string, next?: string) => {
    const redirectTo = `${RESET_REDIRECT}${next ? `?next=${encodeURIComponent(next)}` : ''}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) throw friendlyError(error);
  }, []);

  const setNewPassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw friendlyError(error);
  }, []);

  const signInAnon = useCallback(async (name: string) => {
    const { error } = await supabase.auth.signInAnonymously({ options: { data: { display_name: name.trim() } } });
    if (error) throw friendlyError(error);
  }, []);

  const secureAccount = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.updateUser({ email: email.trim(), password }, { emailRedirectTo: EMAIL_REDIRECT });
      if (error) {
        const f = friendlyError(error);
        throw f.code === 'user_already_exists' ? friendlyError({ message: 'guest_email_taken' }) : f;
      }
      const { data } = await supabase.auth.refreshSession();
      qc.invalidateQueries({ queryKey: qk.profile(userId) });
      if (data.user?.is_anonymous) {
        throw friendlyError({ message: 'Check your email and tap the link to finish saving your account.', code: 'confirm_email' });
      }
    },
    [qc, userId],
  );

  const signOut = useCallback(async () => {
    if (isDeviceOnline() && !isServerDown()) {
      const { error } = await supabase.auth.signOut();
      if (error) await supabase.auth.signOut({ scope: 'local' });
    }
    // Can't reach the server to end the session there: still sign out on this device. supabase-js keeps a session
    // it couldn't renew, so it's removed here too.
    forgetSavedSession();
    claimDeviceFor(null);
    setSession(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: TablesUpdate<'profiles'>) => {
      if (!userId) return;
      must(await supabase.from('profiles').update(patch).eq('id', userId).select('id').single());
      await qc.invalidateQueries({ queryKey: qk.profile(userId) });
    },
    [qc, userId],
  );

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      userId,
      email: session?.user.email ?? null,
      isAnonymous: !!session?.user.is_anonymous,
      profile: profileQ.data ?? null,
      // Only the initial session restore blocks rendering; profile loads after sign-in must not
      // unmount the navigator (that dropped people back on '/').
      loading: !ready,
      profileLoading: !!userId && profileQ.isLoading,
      profileError: profileQ.error,
      signIn,
      signUp,
      signInWithGoogle,
      saveWithGoogle,
      sendPasswordReset,
      setNewPassword,
      signInAnon,
      secureAccount,
      signOut,
      updateProfile,
    }),
    [session, userId, profileQ.data, profileQ.isLoading, profileQ.error, ready, signIn, signUp, signInWithGoogle, saveWithGoogle, sendPasswordReset, setNewPassword, signInAnon, secureAccount, signOut, updateProfile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

/** Sign-in providers switched on in Supabase (Authentication → Providers). Google shows only once it's on. */
export function useAuthProviders() {
  return useQuery({
    queryKey: qk.authProviders(),
    staleTime: 60_000,
    queryFn: async (): Promise<{ google: boolean }> => {
      try {
        const res = await fetch(`${SERVER_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } });
        const body = res.ok ? ((await res.json()) as { external?: Record<string, boolean> }) : {};
        return { google: !!body.external?.google };
      } catch {
        return { google: false };
      }
    },
  });
}

/** Signed-in user id (screens under (app) can rely on it). */
export function useUserId(): string {
  return useAuth().userId ?? '';
}
