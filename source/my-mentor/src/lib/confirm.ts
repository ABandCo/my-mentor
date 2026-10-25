import { Alert, Platform } from 'react-native';

/** Ask before anything hard to undo. Works on Android and web. */
export function confirmAction(title: string, body: string, yes = 'Yes'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${body}`));
  return new Promise((res) =>
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel', onPress: () => res(false) },
      { text: yes, style: 'destructive', onPress: () => res(true) },
    ]),
  );
}
