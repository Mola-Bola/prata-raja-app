import { useState } from 'react';
import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { DEFAULT_SERVER_URL, SERVER_URL, setServerUrl } from '@/data';
import { isHttpUrl } from '@/domain';
import { APP_NAME, Panel, space, TextField, useAppTheme, useToast } from '@/ui';

/**
 * Local-first review helper: the app talks to Supabase on the owner's Mac. If the Mac's Wi-Fi address
 * changes, point the app at the new one here (takes effect after restarting the app).
 */
export function ServerPanel() {
  const theme = useAppTheme();
  const toast = useToast();
  const [value, setValue] = useState(SERVER_URL);
  const valid = isHttpUrl(value);
  return (
    <Panel testID="server-panel" style={{ marginTop: space.md }}>
      <Text variant="titleSmall">Server address</Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Where {APP_NAME} gets its data from. Only change this if you’ve been told the address changed.
      </Text>
      <TextField label="Server" value={value} onChange={setValue} keyboardType="url" autoCapitalize="none" testID="server-url" error={valid ? null : 'Needs to start with http:// or https://'} />
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <Button
          mode="contained"
          disabled={!valid}
          onPress={() => {
            setServerUrl(value === DEFAULT_SERVER_URL ? null : value);
            toast.show(`Saved. Close and reopen ${APP_NAME} to reconnect.`);
          }}
          testID="server-save">
          Save
        </Button>
        <Button
          onPress={() => {
            setServerUrl(null);
            setValue(DEFAULT_SERVER_URL);
            toast.show(`Back to the built-in address. Close and reopen ${APP_NAME}.`);
          }}>
          Reset
        </Button>
      </View>
    </Panel>
  );
}
