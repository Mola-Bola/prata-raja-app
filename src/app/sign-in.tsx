import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { isOwnerEmail, SIGNUP_OPEN, useAuth, useAuthProviders } from '@/data';
import { APP_NAME, BigButton, Screen, space, TextField, useAppTheme, useToast, Wordmark } from '@/ui';

export default function SignIn() {
  const params = useLocalSearchParams<{ mode?: 'in' | 'up' }>();
  const [mode, setMode] = useState<'in' | 'up'>(params.mode === 'up' && SIGNUP_OPEN ? 'up' : 'in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const { signIn, signUp, signInWithGoogle, sendPasswordReset } = useAuth();
  const google = useAuthProviders().data?.google ?? false;
  const toast = useToast();
  const theme = useAppTheme();

  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 6 && (mode === 'in' || name.trim().length > 0);

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === 'in') await signIn(email, password);
      else if (!(await isOwnerEmail(email))) throw new Error('This kitchen is private.');
      else await signUp(email, password, name);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.show('Type your email above first, then tap “Forgot password?” again.');
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email);
      toast.show('Check your email for a link to choose a new password.');
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const withGoogle = async () => {
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      toast.error(e);
    } finally {
      setGoogleBusy(false);
    }
  };

  const other = mode === 'in' ? 'up' : 'in';
  return (
    <Screen
      footer={
        <BigButton large onPress={submit} loading={busy} disabled={!valid || busy} testID="auth-submit">
          {mode === 'in' ? 'Sign in' : 'Create account'}
        </BigButton>
      }>
      {/* The header greets; the button says what it does. (It used to say "Sign in" three times.) */}
      <Stack.Screen options={{ title: mode === 'up' ? `New to ${APP_NAME}` : 'Welcome back' }} />
      <View style={{ gap: space.md, paddingTop: space.lg }}>
        <Wordmark width={120} testID="auth-wordmark" />
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          {mode === 'in' ? 'Sign in with your email and password.' : 'Make an account to keep your things safe and private.'}
        </Text>
        {google ? (
          <>
            <BigButton tone="ghost" icon="google" onPress={withGoogle} loading={googleBusy} disabled={googleBusy || busy} testID="auth-google">
              Continue with Google
            </BigButton>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
              or use your email
            </Text>
          </>
        ) : null}
        {mode === 'up' ? <TextField label="Your name" value={name} onChange={setName} autoCapitalize="words" testID="auth-name" helper="What friends and family call you" /> : null}
        <TextField label="Email" value={email} onChange={setEmail} keyboardType="email-address" autoCapitalize="none" testID="auth-email" />
        <TextField label="Password" value={password} onChange={setPassword} secure autoCapitalize="none" testID="auth-password" helper={mode === 'up' ? 'At least 6 characters' : undefined} />
        {mode === 'in' ? (
          <Button mode="text" compact onPress={forgot} disabled={busy} style={{ alignSelf: 'flex-start' }} contentStyle={{ minHeight: 44 }} testID="auth-forgot">
            Forgot password?
          </Button>
        ) : null}
        {SIGNUP_OPEN ? (
        <View style={[styles.switch, { borderTopColor: theme.colors.outlineVariant }]}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {mode === 'in' ? `New to ${APP_NAME}?` : 'Already have an account?'}
          </Text>
          <Button mode="text" compact onPress={() => setMode(other)} contentStyle={{ minHeight: 44 }} testID={`auth-mode-${other}`}>
            {mode === 'in' ? 'Create an account' : 'Sign in'}
          </Button>
        </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switch: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.xs, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, marginTop: space.sm },
});
