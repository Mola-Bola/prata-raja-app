import { View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import { space, useAppTheme } from '@/ui';

/** Round mic toggle with a caption; pulses (colour) while listening. */
export function MicButton({ listening, onPress, size = 28, caption = true, testID }: { listening: boolean; onPress: () => void; size?: number; caption?: boolean; testID?: string }) {
  const theme = useAppTheme();
  return (
    <View style={{ alignItems: 'center', gap: space.xs }}>
      <IconButton
        icon={listening ? 'stop' : 'microphone'}
        mode="contained"
        size={size}
        containerColor={listening ? theme.colors.error : theme.colors.primary}
        iconColor={listening ? theme.colors.onError : theme.colors.onPrimary}
        onPress={onPress}
        accessibilityLabel={listening ? 'Stop listening' : 'Speak instead of typing'}
        testID={testID}
      />
      {caption ? (
        <Text variant="labelSmall" style={{ color: listening ? theme.colors.error : theme.colors.onSurfaceVariant }}>
          {listening ? 'Listening… tap to stop' : 'Tap to talk'}
        </Text>
      ) : null}
    </View>
  );
}
