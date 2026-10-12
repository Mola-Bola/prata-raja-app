// Grabs the current screen (phones only) just before the feedback sheet opens.
import { Platform } from 'react-native';
import { captureScreen } from 'react-native-view-shot';

export async function captureCurrentScreen(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await captureScreen({ format: 'jpg', quality: 0.55, result: 'base64', width: 720 });
  } catch {
    return null;
  }
}
