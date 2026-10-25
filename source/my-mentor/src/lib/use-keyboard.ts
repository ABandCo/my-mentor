import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** True while the on-screen keyboard is open (used to hide the floating tab bar and lift composers). */
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const a = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return visible;
}
