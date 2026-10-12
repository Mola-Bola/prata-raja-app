// The app's logo: its name set in the heading face. `coral` letters sit on the page (the top of Home, light and dark);
// `ink` letters sit on a coral screen (the start-up screen, Welcome). One place: every screen that shows the logo uses
// this. To use a drawn logo instead, replace the Text with an Image of your own artwork and keep the props.
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { APP_NAME } from './labels';
import { useAppTheme } from './useAppTheme';

export function Wordmark({ testID = 'wordmark', variant = 'coral', width = 104 }: { testID?: string; variant?: 'coral' | 'ink'; width?: number }) {
  const theme = useAppTheme();
  const color = variant === 'ink' ? theme.colors.onCoral : theme.colors.coralDeep;
  return (
    <View testID={testID} accessible accessibilityRole="image" accessibilityLabel={APP_NAME} style={{ width }}>
      <Text variant="displaySmall" numberOfLines={1} adjustsFontSizeToFit style={{ color, fontSize: Math.round(width / 4.4), lineHeight: Math.round(width / 3.6) }} accessible={false}>
        {APP_NAME}
      </Text>
    </View>
  );
}
