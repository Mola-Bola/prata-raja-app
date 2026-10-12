import { router, Stack } from 'expo-router';
import { Button } from 'react-native-paper';

import { useAuth } from '@/data';
import { EmptyState, Screen, TAB_LABELS } from '@/ui';

/** Any address the app doesn't have (a mistyped or old link), instead of Expo's developer page. */
export default function NotFound() {
  const { session } = useAuth();
  return (
    <Screen scroll={false} testID="not-found">
      <Stack.Screen options={{ title: 'Page not found', headerShown: true }} />
      <EmptyState
        emoji="🧭"
        title="We can’t find that page"
        body="The link may be old or mistyped."
        action={
          <Button mode="contained" onPress={() => router.replace(session ? '/' : '/welcome')} testID="not-found-home">
            {session ? `Go to ${TAB_LABELS.home}` : 'Go to the start'}
          </Button>
        }
      />
    </Screen>
  );
}
