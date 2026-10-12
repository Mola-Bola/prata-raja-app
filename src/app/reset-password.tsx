import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAuth } from '@/data';
import { resetReturnPath } from '@/domain';
import { APP_NAME, BigButton, EmptyState, Screen, space, TextField, useAppTheme, useToast, Wordmark } from '@/ui';

/**
 * Opened from the "choose a new password" email: the link signs them in, then they pick a new password here.
 * `?expired=1`: the link was used already or ran out (src/features/links/useOpenPasswordReset.ts), even if this
 * browser is still signed in. `?next=/some/page`: go back to that page afterwards.
 */
export default function ResetPassword() {
  const params = useLocalSearchParams<{ expired?: string; next?: string }>();
  const { session, email, setNewPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const theme = useAppTheme();

  if (!session || params.expired) {
    return (
      <Screen>
        <View testID="reset-expired">
          <EmptyState
            emoji="🔑"
            title="This link has expired"
            body={
              session
                ? `Links in ${APP_NAME}’s emails work once and only for a short while. You’re still signed in, so there’s nothing else to do.`
                : `Links in ${APP_NAME}’s emails work once and only for a short while. To choose a new password, ask for a new link from the sign-in screen.`
            }
          />
        </View>
        <BigButton onPress={() => router.replace(session ? '/' : '/sign-in')} testID="reset-back">
          {session ? 'Go to Home' : 'Go to sign in'}
        </BigButton>
      </Screen>
    );
  }

  const save = async () => {
    setBusy(true);
    try {
      await setNewPassword(password);
      toast.show('New password saved.');
      router.replace(resetReturnPath(params.next) as never);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={
        <BigButton large onPress={save} loading={busy} disabled={password.length < 6 || busy} testID="reset-save">
          Save new password
        </BigButton>
      }>
      <View style={{ gap: space.md, paddingTop: space.lg }}>
        <Wordmark width={120} testID="reset-wordmark" />
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Choose a new password{email ? ` for ${email}` : ''}.
        </Text>
        <TextField label="New password" value={password} onChange={setPassword} secure autoCapitalize="none" testID="reset-password" helper="At least 6 characters" />
      </View>
    </Screen>
  );
}
