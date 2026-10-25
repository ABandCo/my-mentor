import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MentorOrb } from '@/components/mentor-orb';
import { tap } from '@/components/ui';
import { useKeyboardVisible } from '@/lib/use-keyboard';
import { colors, fonts, radius, shadow, space } from '@/theme/tokens';

const ITEMS: Record<string, { label: string; icon: string }> = {
  index: { label: 'Home', icon: '🏡' },
  habits: { label: 'Habits', icon: '🌱' },
  mentor: { label: 'Mentor', icon: '' },
  grow: { label: 'Grow', icon: '📈' },
  me: { label: 'Me', icon: '🙂' },
};

export function FloatingTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardVisible();
  if (keyboard) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, space(1.5)) }]}>
      <View style={[styles.bar, shadow.float]}>
        {state.routes.map((route, i) => {
          const item = ITEMS[route.name];
          if (!item) return null;
          const focused = state.index === i;
          const go = () => {
            tap();
            if (!focused) navigateToTab(route.key);
          };
          if (route.name === 'mentor') {
            return (
              <Pressable key={route.key} onPress={go} accessibilityRole="button" accessibilityLabel="Talk to Mentor" style={styles.orbBtn}>
                <View style={styles.orbLift}>
                  <MentorOrb size={50} state={focused ? 'listening' : 'idle'} />
                </View>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={route.key}
              onPress={go}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={item.label}
              style={styles.item}>
              <View style={[styles.pill, focused && { backgroundColor: colors.primarySoft }]}>
                <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.7 }}>{item.icon}</Text>
              </View>
              <Text style={[styles.label, focused && { color: colors.primaryText, fontFamily: fonts.bodyBold }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space(2) },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 72,
    paddingHorizontal: space(1),
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 56, gap: 2 },
  pill: { width: 48, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.muted },
  orbBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 56 },
  orbLift: { marginTop: -34 },
});
