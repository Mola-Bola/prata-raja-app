import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import { needsYou, useAuth, useFeedbackList } from '@/data';
import { setLargeText, useLargeText } from '@/features/settings/largeText';
import { ServerPanel } from '@/features/settings/ServerPanel';
import { feedbackStore, useFeedbackStore } from '@/features/feedback/store';
import { feedbackTeam, notesSummary } from '@/features/feedback/labels';
import { checkAndFetch, currentUpdateId, applyUpdate, updatesSupported } from '@/features/feedback/updates';
import { APP_NAME, AppHeader, BigButton, ErrorView, ListGroup, ListRow, Panel, PersonAvatar, Pill, Screen, Section, space, ToggleRow, useAppTheme, useConfirm, useToast } from '@/ui';

export default function MeTab() {
  const { profile, profileLoading, profileError, email, isAnonymous, signOut } = useAuth();
  const qc = useQueryClient();
  const reloadProfile = () => qc.invalidateQueries({ queryKey: ['profile'] });
  const confirm = useConfirm();
  const toast = useToast();
  const theme = useAppTheme();
  const [showServer, setShowServer] = useState(false);
  const largeText = useLargeText();
  const feedback = useFeedbackList();
  const { hidden } = useFeedbackStore();
  const waiting = (feedback.data ?? []).filter(needsYou).length;
  const [checking, setChecking] = useState(false);
  const checkUpdates = async () => {
    setChecking(true);
    const ready = await checkAndFetch();
    setChecking(false);
    if (ready) toast.show('Update downloaded.', { label: 'Restart', onPress: () => applyUpdate() });
    else toast.show('You’re on the latest version.');
  };

  const name = profile?.display_name || 'You';
  const team = feedbackTeam(profile?.is_admin);

  const onSignOut = async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: isAnonymous
        ? 'You joined with just your name. If you sign out now you won’t be able to get back into this account.'
        : 'You can sign back in any time with your email and password.',
      confirmLabel: 'Sign out',
      danger: isAnonymous,
    });
    if (!ok) return;
    try {
      await signOut();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Screen header={<AppHeader title="Me" />}>
      {/* Until the profile has loaded, show that, not made-up facts ("You", "Not set"). */}
      {!profile ? (
        <Panel style={{ marginTop: space.sm }} testID="me-profile-missing">
          {profileLoading ? (
            <ActivityIndicator style={{ paddingVertical: space.lg }} accessibilityLabel="Loading your profile" />
          ) : (
            <ErrorView error={profileError} onRetry={reloadProfile} />
          )}
        </Panel>
      ) : (
        <Panel testID="me-profile" style={{ marginTop: space.sm }}>
          <View style={styles.profileRow}>
            <PersonAvatar name={name} size={56} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="titleLarge" style={{ fontWeight: '700' }} numberOfLines={1}>
                {name}
              </Text>
              {!isAnonymous && email ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                  {email}
                </Text>
              ) : null}
            </View>
          </View>
        </Panel>
      )}

      <Section title="Feedback & ideas" subtitle={`Tell ${team.name} what you like, what’s off, and what to change`}>
        <Panel onPress={() => router.push('/feedback')} testID="me-feedback" style={{ paddingVertical: space.md }}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="message-draw" size={22} color={theme.colors.onPrimaryContainer} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium">My notes</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} testID="me-feedback-summary">
                {feedback.data ? notesSummary(feedback.data) : `Your notes to ${team.name}, and what’s planned`}
              </Text>
            </View>
            {waiting ? <Pill label={String(waiting)} tone="warn" /> : null}
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
          </View>
        </Panel>
        {/* The whole row is the switch (a bare switch was a 40 × 20 target). */}
        <View style={{ paddingHorizontal: space.sm }}>
          <ToggleRow
            label="Show feedback button"
            description="The tab on the right edge of every screen. Long-press it to talk."
            value={!hidden}
            onChange={(v) => feedbackStore.setHidden(!v)}
            testID="me-feedback-toggle"
          />
        </View>
      </Section>

      <Section title="App">
        <View style={{ paddingHorizontal: space.sm }}>
          <ToggleRow label="Larger text" description="Makes everything a little bigger, on top of your phone’s own setting." value={largeText} onChange={setLargeText} testID="me-large-text" />
        </View>
        <ListGroup>
          <ListRow
            leading={<LeadIcon icon="star-four-points-outline" bg={theme.colors.secondaryContainer} fg={theme.colors.onSecondaryContainer} />}
            headline="What’s new"
            supporting="What changed in recent updates"
            chevron
            onPress={() => router.push('/whats-new')}
            testID="me-whats-new"
          />
          {updatesSupported ? (
            <ListRow
              leading={<LeadIcon icon="update" bg={theme.colors.secondaryContainer} fg={theme.colors.onSecondaryContainer} />}
              headline="Check for updates"
              trailing={checking ? <ActivityIndicator size={20} /> : null}
              onPress={checking ? undefined : checkUpdates}
              testID="me-check-updates"
            />
          ) : null}
        </ListGroup>
      </Section>

      <BigButton tone="ghost" icon="logout" onPress={onSignOut} style={{ marginTop: space.xl }} testID="me-sign-out">
        Sign out
      </BigButton>

      {/* The one place the version shows. Long-press it to show the server address (for when the host Mac's IP changes). */}
      <Text
        variant="bodyMedium"
        onLongPress={() => setShowServer((v) => !v)}
        style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: space.xl }}
        testID="me-version">
        {APP_NAME} {Constants.expoConfig?.version ?? ''}
        {updatesSupported && currentUpdateId() !== 'built-in' ? ` · update ${String(currentUpdateId()).slice(0, 8)}` : ''}
      </Text>
      {showServer ? <ServerPanel /> : null}
    </Screen>
  );
}

function LeadIcon({ icon, bg, fg }: { icon: string; bg: string; fg: string }) {
  return (
    <View style={[styles.iconWrap, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name={icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']} size={22} color={fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
