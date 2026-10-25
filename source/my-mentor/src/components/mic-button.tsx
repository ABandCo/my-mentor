import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/kit';
import { tap } from '@/components/ui';
import { useVoiceInput } from '@/lib/voice';
import { useStore } from '@/lib/store';
import { colors, fonts, touch } from '@/theme/tokens';

/**
 * Hold to talk. Release to send the recognised text to `onText`. While held, a live preview is shown via `onPartial`.
 * Tap-and-hold is easier than tap-to-toggle with one thumb; a short tap shows a hint instead of failing silently.
 */
export function MicButton({ onText, onPartial, size = touch.min, hint = true }: { onText: (t: string) => void; onPartial?: (t: string) => void; size?: number; hint?: boolean }) {
  const { state } = useStore();
  const v = useVoiceInput(state.profile.language, onText);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = v.listening ? withRepeat(withTiming(1.25, { duration: 600 }), -1, true) : withTiming(1);
  }, [v.listening, pulse]);
  useEffect(() => {
    if (v.listening) onPartial?.(v.text);
  }, [v.text, v.listening, onPartial]);

  const ring = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }], opacity: v.listening ? 0.35 : 0 }));
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: colors.firm }, ring]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={v.listening ? 'Listening. Release to send' : 'Hold to talk'}
          accessibilityHint="Press and hold, speak, then release"
          onPressIn={() => {
            tap('success');
            v.start();
          }}
          onPressOut={v.stop}
          style={[styles.btn, { width: size, height: size, borderRadius: size / 2, backgroundColor: v.listening ? colors.firm : colors.primarySoft }]}>
          <Icon name={v.listening ? 'mic' : 'mic-outline'} size={size * 0.46} color={v.listening ? '#fff' : colors.primaryText} />
        </Pressable>
      </View>
      {v.error ? <Text style={styles.err}>{v.error}</Text> : hint && v.listening ? <Text style={styles.hint}>Listening…</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
  err: { fontFamily: fonts.body, fontSize: 12, color: colors.firmText, maxWidth: 220, textAlign: 'center', marginTop: 4 },
  hint: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.firmText, marginTop: 4 },
});
