import { Redirect } from 'expo-router';

import { useAuth } from '@/data';

/** Native sign-in links (Google, the confirm-your-email message) open prata-raja://auth-callback. src/data/auth.tsx takes the
 *  tokens out of the link and signs in; this screen only moves on: to Home once signed in, otherwise to Welcome (an
 *  expired link). Sending a signed-out visitor to "/" would leave a blank screen, since Home needs an account. */
export default function AuthCallback() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return <Redirect href={session ? '/' : '/welcome'} />;
}
